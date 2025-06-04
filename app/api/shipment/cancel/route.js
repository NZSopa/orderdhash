import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const { orderIds } = await request.json()

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return NextResponse.json({ error: '취소할 주문을 선택해주세요.' })
      }

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        // 주문 상태를 'ordered'로 되돌림
        const updateOrdersStmt = db.prepare(`
          UPDATE orders 
          SET status = 'ordered',
              shipment_no = NULL,
              updated_at = datetime('now')
          WHERE id IN (${orderIds.map(() => '?').join(',')})
          AND status = 'preparing'
        `)
        
        updateOrdersStmt.run(...orderIds)

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ 
          success: true,
          message: '출하 취소가 완료되었습니다.'
        })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error canceling shipments:', error)
      return NextResponse.json(
        { error: '출하 취소 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 