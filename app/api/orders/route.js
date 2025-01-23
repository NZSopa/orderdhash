import { NextResponse } from 'next/server'
import { getDB, withDB } from '../../lib/db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20
  const search = searchParams.get('search') || ''
  const offset = (page - 1) * limit

  return await withDB(async (db) => {
    try {
      // 검색 조건 설정
      const searchCondition = search
        ? `AND (o.reference_no LIKE ? OR o.sku LIKE ? OR o.consignee_name LIKE ?)`
        : ''
      const searchParams = search
        ? [`%${search}%`, `%${search}%`, `%${search}%`]
        : []

      // 전체 주문 수 조회
      const countStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM orders o
        WHERE 1=1 ${searchCondition}
      `)
      const { total } = countStmt.get(...searchParams)

      // 주문 목록 조회 (sales_listings와 JOIN)
      const stmt = db.prepare(`
        SELECT 
          o.*,
          sl.set_qty,
          sl.product_name
        FROM orders o
        LEFT JOIN sales_listings sl ON o.sku = sl.sales_code
        WHERE 1=1 ${searchCondition}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `)
      
      const orders = stmt.all(...searchParams, limit, offset)

      return NextResponse.json({
        data: orders,
        total,
        page,
        limit
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: '주문 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
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
          reference_no,
          sku,
          original_product_name,
          quantity,
          unit_value,
          consignee_name,
          kana,
          postal_code,
          address,
          phone_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      try {
        const insertMany = db.transaction((orders) => {
          for (const order of orders) {
            stmt.run([
              order.reference_no,
              order.sku,
              order.original_product_name,
              order.quantity,
              order.unit_value,
              order.consignee_name,
              order.kana,
              order.postal_code,
              order.address,
              order.phone_number
            ])
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

export async function DELETE(req) {
  const db = getDB()
  try {
    const { reference_no } = await req.json()
    console.log('Received reference_no:', reference_no)
    
    const stmt = db.prepare(deleteQuery)
    stmt.run(reference_no)
    
    return NextResponse.json({
      success: true,
      message: '주문이 성공적으로 삭제되었습니다.'
    })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: '주문 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

const deleteQuery = `
  DELETE FROM orders WHERE reference_no = ?
` 