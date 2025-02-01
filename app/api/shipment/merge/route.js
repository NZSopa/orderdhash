import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function POST(request) {
  const db = getDB()
  
  try {
    const orders = await request.json()
    
    // 트랜잭션 시작
    await db.exec('BEGIN TRANSACTION')

    try {
      // 모든 선택된 주문에 동일한 shipment_batch 할당
      const updateStmt = db.prepare(`
        UPDATE orders 
        SET shipment_batch = ?
        WHERE id = ?
      `)

      for (const order of orders) {
        updateStmt.run(order.shipment_batch, order.id)
      }

      // 트랜잭션 커밋
      await db.exec('COMMIT')

      return NextResponse.json({ 
        message: '합배송 처리가 완료되었습니다.' 
      })

    } catch (error) {
      // 오류 발생 시 롤백
      await db.exec('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error processing merge shipment:', error)
    return NextResponse.json({ 
      error: '합배송 처리 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 