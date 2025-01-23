import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const { shipmentIds } = await request.json()

      if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
        return NextResponse.json({ error: '취소할 출하를 선택해주세요.' })
      }

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        // 주문 상태 업데이트 (출하 상태 제거)
        const updateOrdersStmt = db.prepare(`
          UPDATE orders 
          SET status = REPLACE(status, 'sh', ''),
              updated_at = datetime('now')
          WHERE reference_no IN (
            SELECT DISTINCT s.reference_no 
            FROM shipment s
            WHERE s.id IN (${shipmentIds.map(() => '?').join(',')})
          )
        `)
        updateOrdersStmt.run(...shipmentIds)

        // 출하 정보 삭제
        const deleteShipmentsStmt = db.prepare(`
          DELETE FROM shipment 
          WHERE id IN (${shipmentIds.map(() => '?').join(',')})
        `)
        deleteShipmentsStmt.run(...shipmentIds)

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ success: true })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error canceling shipments:', error)
      return NextResponse.json({ error: '출하 취소 중 오류가 발생했습니다.' })
    }
  })
} 