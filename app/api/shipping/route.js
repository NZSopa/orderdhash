import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  let db = null
  try {
    db = getDB()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = (page - 1) * limit

    let whereClause = ''
    const params = []

    if (query) {
      whereClause = `
        WHERE sl_number LIKE ? 
        OR consignee_name LIKE ?
      `
      params.push(`%${query}%`, `%${query}%`)
    }

    const stmt = db.prepare(`
      WITH PagedData AS (
        SELECT 
          *,
          COUNT(*) OVER() as total_count
        FROM shipping_list 
        ${whereClause}
        ORDER BY shipping_date DESC, sl_number DESC
        LIMIT ? OFFSET ?
      )
      SELECT * FROM PagedData
    `)

    const shippingList = stmt.all(...params, limit, offset)
    const total = shippingList.length > 0 ? shippingList[0].total_count : 0

    return NextResponse.json({
      success: true,
      data: shippingList.map(({ total_count, ...item }) => item),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching shipping list:', error)
    return NextResponse.json(
      { success: false, error: '출하 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  let db = null
  try {
    db = getDB()
    const data = await request.json()
    
    const stmt = db.prepare(`
      INSERT INTO shipping_list (
        sl_number, sales_site, consignee_name, product_code,
        product_name, set_qty, quantity, shipping_country,
        tracking_number, shipping_date, order_date, weight
      ) VALUES (
        @sl_number, @sales_site, @consignee_name, @product_code,
        @product_name, @set_qty, @quantity, @shipping_country,
        @tracking_number, @shipping_date, @order_date, @weight
      )
    `)

    stmt.run(data)

    return NextResponse.json({ 
      success: true,
      message: '출하 정보가 등록되었습니다.' 
    })
  } catch (error) {
    console.error('Error saving shipping info:', error)
    return NextResponse.json(
      { success: false, error: '출하 정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 