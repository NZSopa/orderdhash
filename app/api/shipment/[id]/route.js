import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function PUT(request, { params }) {
  return await withDB(async (db) => {
    try {
      const { field, value } = await request.json()
      const shipmentId = params.id

      // 출하번호 중복 체크
      if (field === 'shipment_no') {
        const existing = db.prepare(`
          SELECT id FROM shipment 
          WHERE shipment_no = ? AND id != ?
        `).get(value, shipmentId)

        if (existing) {
          return NextResponse.json({ error: '이미 사용 중인 출하번호입니다.' })
        }
      }

      // 상태 값 검증
      if (field === 'status' && !['processing', 'shipped'].includes(value)) {
        return NextResponse.json({ error: '잘못된 상태 값입니다.' })
      }

      // 데이터 업데이트
      const updateQuery = db.prepare(`
        UPDATE shipment 
        SET ${field} = ?, 
            updated_at = datetime('now')
        WHERE id = ?
      `)
      
      updateQuery.run(value, shipmentId)

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error updating shipment:', error)
      return NextResponse.json({ error: '출하 정보 수정 중 오류가 발생했습니다.' })
    }
  })
} 