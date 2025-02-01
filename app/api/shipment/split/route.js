import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function POST(request) {
  const db = getDB()
  
  try {
    const orders = await request.json()
    
    // 트랜잭션 시작
    await db.exec('BEGIN TRANSACTION')

    try {
      for (const order of orders) {
        // 원래 주문의 수량 업데이트
        if (order.remaining_quantity > 0) {
          // 기존 주문 수량 업데이트
          await db.prepare(`
            UPDATE orders 
            SET quantity = ?, 
                status = 'partially_shipped',
                shipment_batch = CASE 
                  WHEN shipment_batch IS NOT NULL THEN ? 
                  ELSE shipment_batch 
                END
            WHERE id = ?
          `).run(
            order.remaining_quantity, 
            order.original_batch, // 기존 배치 ID 유지
            order.id
          )

          // 분할된 새 주문 생성
          await db.prepare(`
            INSERT INTO orders (
              reference_no, sales_site, product_code, 
              product_name, quantity, sales_price,
              order_date, shipment_batch, status,
              consignee_name, consignee_address,
              kana, shipment_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ordered', ?, ?, ?, ?)
          `).run(
            order.reference_no,
            order.sales_site,
            order.product_code,
            order.product_name,
            order.quantity,
            order.sales_price,
            order.order_date,
            order.shipment_batch,
            order.consignee_name,
            order.consignee_address,
            order.kana,
            order.shipment_location
          )
        } else {
          // 전체 수량을 배송하는 경우
          await db.prepare(`
            UPDATE orders 
            SET shipment_batch = ?,
                status = 'ordered'
            WHERE id = ?
          `).run(order.shipment_batch, order.id)
        }

        // 만약 원래 합배송이었다면, 다른 합배송 주문들의 배치 ID도 업데이트
        if (order.original_batch) {
          await db.prepare(`
            UPDATE orders 
            SET shipment_batch = ?
            WHERE shipment_batch = ? AND id != ?
          `).run(order.original_batch, order.original_batch, order.id)
        }
      }

      // 트랜잭션 커밋
      await db.exec('COMMIT')

      return NextResponse.json({ 
        message: '분할 배송 처리가 완료되었습니다.' 
      })

    } catch (error) {
      // 오류 발생 시 롤백
      await db.exec('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error processing split shipment:', error)
    return NextResponse.json({ 
      error: '분할 배송 처리 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 