import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function POST(request) {
  return await withDB(async (db) => {
    const { orders, confirmations } = await request.json()

    try {
      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i]
        const confirmation = confirmations[i]
        const stockField = confirmation.shipping_from === 'aus' ? 'aus_stock' : 'nz_stock'

        // 재고 업데이트
        const updateInventory = db.prepare(`
          UPDATE inventory 
          SET ${stockField} = ${stockField} - ? 
          WHERE product_code = ?
        `)
        updateInventory.run(order.quantity * (order.set_qty || 1), order.sku)

        // 출하 정보 저장
        const insertShipment = db.prepare(`
          INSERT INTO shipment (
            shipment_no, 
            reference_no, 
            sku, 
            shipment_location,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `)
        insertShipment.run(
          confirmation.shipment_no,
          order.reference_no,
          order.sku,
          confirmation.shipping_from,
          'processing'
        )

        // 주문 상태 업데이트
        const updateOrder = db.prepare(`
          UPDATE orders 
          SET status = 'sh', 
              updated_at = datetime('now') 
          WHERE reference_no = ?
        `)
        updateOrder.run(order.reference_no)
      }

      // 트랜잭션 커밋
      db.prepare('COMMIT').run()

      return NextResponse.json({ success: true })
    } catch (error) {
      // 트랜잭션 롤백
      db.prepare('ROLLBACK').run()
      console.error('Error confirming shipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  })
} 