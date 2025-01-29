import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  try {
    const db = getDB()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const settlementMonth = searchParams.get('settlementMonth')
    
    const offset = (page - 1) * limit

    // 검색 조건 구성
    const whereClause = []
    const params = []

    if (search) {
      whereClause.push(`(
        product_code LIKE ? OR 
        product_name LIKE ? OR 
        sales_site LIKE ?
      )`)
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (settlementMonth && settlementMonth !== '') {
      whereClause.push('settlement_month LIKE ?')
      params.push(`%${settlementMonth}%`)
    } else if (startDate && endDate) {
        whereClause.push('order_date BETWEEN ? AND ?')
        params.push(startDate, endDate)
    }


    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : ''

    // 주문 요약 데이터 조회
    const query = `
      SELECT 
        order_date,
        order_number,
        sales_site,
        product_code,
        product_name,
        quantity,
        sales_price ,
        purchase_cost,
        profit,
        settlement_month
      FROM order_summary
      ${whereStr}
      GROUP BY sales_site, product_code, product_name, settlement_month
      ORDER BY order_date DESC
      LIMIT ? OFFSET ?
    `

    // 전체 건수 조회
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT DISTINCT sales_site, product_code, product_name, settlement_month
        FROM order_summary
        ${whereStr}
      ) t
    `

    const orders = await db.prepare(query).all(...params, limit, offset)
    const { total } = await db.prepare(countQuery).get(...params)

    return NextResponse.json({
      data: orders,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: '주문 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
