import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function GET(request) {
  return await withDB(async (db) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page')) || 1
      const limit = parseInt(searchParams.get('limit')) || 20
      const location = searchParams.get('location') || 'all'
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      // 검색 조건 설정
      let whereClause = "WHERE status = 'shipped'"
      const params = []

      if (location !== 'all') {
        whereClause += " AND shipment_location = ?"
        params.push(location)
      }

      if (startDate && endDate) {
        whereClause += " AND shipment_at BETWEEN ? AND ?"
        params.push(startDate, endDate + ' 23:59:59')
      }

      // 전체 건수 조회
      const countStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM shipment
        ${whereClause}
      `)
      const { total } = countStmt.get(...params)

      // 출하 완료 목록 조회
      const stmt = db.prepare(`
        SELECT *
        FROM shipment
        ${whereClause}
        ORDER BY shipment_at DESC
        LIMIT ? OFFSET ?
      `)
      
      const offset = (page - 1) * limit
      const data = stmt.all(...params, limit, offset)

      return NextResponse.json({
        data,
        total,
        page,
        limit
      })
    } catch (error) {
      console.error('Error fetching completed shipments:', error)
      return NextResponse.json(
        { error: '출하 완료 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 