import { NextResponse } from 'next/server'
import { getDB } from '../../lib/db'

export async function GET(request) {
  const db = getDB()
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const date = searchParams.get('date')
    const offset = (page - 1) * limit

    let query = `
      WITH filtered_orders AS (
        SELECT * FROM orders
        WHERE (
          reference_no LIKE ? 
          OR sku LIKE ?
          OR product_name LIKE ?
          OR consignee_name LIKE ?
          OR post_code LIKE ?
          OR address LIKE ?
          OR phone_number LIKE ?
        )
        ${date ? "AND DATE(created_at) = DATE(?)" : ""}
      )
      SELECT * FROM filtered_orders
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const searchPattern = `%${search}%`
    let params = Array(7).fill(searchPattern)
    if (date) {
      params.push(date)
    }
    params = params.concat([limit, offset])
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders
      WHERE (
        reference_no LIKE ? 
        OR sku LIKE ?
        OR product_name LIKE ?
        OR consignee_name LIKE ?
        OR post_code LIKE ?
        OR address LIKE ?
        OR phone_number LIKE ?
      )
      ${date ? "AND DATE(created_at) = DATE(?)" : ""}
    `
    
    const orders = db.prepare(query).all(...params)
    const { total } = db.prepare(countQuery).get(...params.slice(0, date ? 8 : 7))
    
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

export async function POST(req) {
  const db = getDB()
  try {
    const orders = await req.json()
    console.log('Received orders:', orders.length)
    
    // 기존 주문번호 조회
    const duplicateErrors = []
    const validOrders = []

    // 모든 주문번호 목록을 한 번에 가져오기
    const existingOrders = db.prepare('SELECT reference_no FROM orders').all()
    const existingRefNos = new Set(existingOrders.map(order => order.reference_no))
    
    console.log('Existing reference numbers:', existingRefNos.size)

    for (const order of orders) {
      console.log('Checking order:', order.reference_no)
      
      if (existingRefNos.has(order.reference_no)) {
        console.log('Duplicate found:', order.reference_no)
        duplicateErrors.push({
          reference_no: order.reference_no,
          error_type: 'duplicate',
          message: '이미 등록된 주문번호입니다.'
        })
      } else {
        validOrders.push(order)
      }
    }

    console.log('Valid orders:', validOrders.length)
    console.log('Duplicate errors:', duplicateErrors.length)

    // 유효한 주문만 저장
    if (validOrders.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO orders (
          reference_no, sku, product_name, original_product_name,
          quantity, unit_value, consignee_name, kana,
          post_code, address, phone_number, created_at
        ) VALUES (
          @reference_no, @sku, @product_name, @original_product_name,
          @quantity, @unit_value, @consignee_name, @kana,
          @post_code, @address, @phone_number, @created_at
        )
      `)

      try {
        const insertMany = db.transaction((orders) => {
          for (const order of orders) {
            stmt.run(order)
          }
        })

        insertMany(validOrders)
        console.log('Successfully inserted orders')
      } catch (insertError) {
        console.error('Error inserting orders:', insertError)
        throw insertError
      }
    }

    return NextResponse.json({
      success: true,
      total: validOrders.length,
      duplicateErrors: duplicateErrors,
      errorCount: duplicateErrors.length,
      summary: {
        total: orders.length,
        success: validOrders.length,
        error: duplicateErrors.length
      }
    })

  } catch (error) {
    console.error('Error processing orders:', error)
    return NextResponse.json(
      { error: '주문 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 