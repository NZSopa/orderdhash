import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  const db = getDB()
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20
  const search = searchParams.get('search') || ''
  const offset = (page - 1) * limit

  try {
    let query = `
      WITH filtered_orders AS (
        SELECT * FROM orders
        WHERE reference_no LIKE ? 
        OR sku LIKE ?
        OR product_name LIKE ?
        OR consignee_name LIKE ?
        OR post_code LIKE ?
        OR address LIKE ?
        OR phone_number LIKE ?
      )
      SELECT * FROM filtered_orders
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const searchPattern = `%${search}%`
    const params = Array(7).fill(searchPattern).concat([limit, offset])
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders
      WHERE reference_no LIKE ? 
      OR sku LIKE ?
      OR product_name LIKE ?
      OR consignee_name LIKE ?
      OR post_code LIKE ?
      OR address LIKE ?
      OR phone_number LIKE ?
    `
    
    const orders = db.prepare(query).all(...params)
    const { total } = db.prepare(countQuery).get(...Array(7).fill(searchPattern))
    
    return NextResponse.json({
      data: orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: '주문 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 