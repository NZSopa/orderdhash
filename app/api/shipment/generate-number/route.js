import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const { shipmentIds, location } = await request.json()
      
      if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
        return NextResponse.json({ error: '출하 정보가 없습니다.' })
      }

      // 현재 날짜 정보 가져오기
      const date = new Date()
      const year = date.getFullYear().toString().slice(-2) // 년도 뒤 2자리
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      // 해당 날짜의 마지막 번호 조회 (선택된 주문 제외)
      const lastShipment = db.prepare(`
        SELECT shipment_no
        FROM orders
        WHERE shipment_no LIKE ? 
        AND shipment_location = ?
        AND id NOT IN (${shipmentIds.map(() => '?').join(',')})
        ORDER BY shipment_no DESC
        LIMIT 1
      `).get(
        `${location === 'aus_kn' ? 'HS' : 'SKA'}${year}${month}${day}%`,
        location,
        ...shipmentIds
      )
      
      let sequence = 1
      if (lastShipment) {
        sequence = parseInt(lastShipment.shipment_no.slice(-3)) + 1
      }

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        // 1. 선택된 출하건들의 출하번호 초기화
        const clearShipmentNoStmt = db.prepare(`
          UPDATE orders
          SET shipment_no = NULL
          WHERE id IN (${shipmentIds.map(() => '?').join(',')})
        `)
        clearShipmentNoStmt.run(...shipmentIds)

        // 2. product_name으로 정렬된 출하 정보 조회
        const shipments = db.prepare(`
          SELECT id, product_name
          FROM orders
          WHERE id IN (${shipmentIds.map(() => '?').join(',')})
          ORDER BY product_name COLLATE NOCASE ASC
        `).all(...shipmentIds)

        // 3. 새로운 출하번호 생성 및 업데이트
        const prefix = location === 'aus_kn' ? 'HS' : 'SKA'
        const updateStmt = db.prepare(`
          UPDATE orders
          SET shipment_no = ?
          WHERE id = ?
        `)

        const results = []
        for (const shipment of shipments) {
          const shipmentNo = `${prefix}${year}${month}${day}${String(sequence).padStart(3, '0')}`
          updateStmt.run(shipmentNo, shipment.id)
          results.push({ id: shipment.id, shipmentNo })
          sequence++
        }

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()
        
        return NextResponse.json({ success: true, results })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error generating shipment numbers:', error)
      return NextResponse.json(
        { error: '출하번호 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 