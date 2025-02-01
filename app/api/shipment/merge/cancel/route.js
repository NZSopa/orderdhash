import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function POST(request) {
  const db = getDB()
  
  try {
    const orders = await request.json()
    
    // 트랜잭션 시작
    await db.exec('BEGIN TRANSACTION')

    try {
      // 선택된 주문들의 shipment_batch를 NULL로 설정
      const stmt = db.prepare(`
        UPDATE orders 
        SET shipment_batch = NULL,
            updated_at = datetime('now')
        WHERE id = ?
      `)

      for (const order of orders) {
        stmt.run(order.id)
      }

      // 트랜잭션 커밋
      await db.exec('COMMIT')

      return NextResponse.json({ 
        message: '합배송이 취소되었습니다.' 
      })

    } catch (error) {
      // 오류 발생 시 롤백
      await db.exec('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error canceling merge shipment:', error)
    return NextResponse.json({ 
      error: '합배송 취소 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 