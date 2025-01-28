import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const { shipmentIds } = await request.json()

      if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
        return NextResponse.json(
          { error: '취소할 출하를 선택해주세요.' },
          { status: 400 }
        )
      }

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        // 출하 상태를 'processing'으로 변경
        const stmt = db.prepare(`
          UPDATE shipment
          SET status = 'processing'
          WHERE id IN (${shipmentIds.map(() => '?').join(',')})
          AND status = 'shipped'
        `)
        
        stmt.run(shipmentIds)

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ message: '출하 완료가 취소되었습니다.' })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error canceling completed shipments:', error)
      return NextResponse.json(
        { error: '출하 완료 취소 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 