import { NextResponse } from 'next/server'
import { getDB } from '../../lib/db'

export async function GET(request) {
  let db = null
  try {
    db = getDB()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const date = searchParams.get('date')
    const offset = (page - 1) * limit

    const searchPattern = `%${search}%`
    const baseParams = [
      searchPattern, // reference_no
      searchPattern, // sku
      searchPattern, // consignee_name
      searchPattern, // postal_code
      searchPattern, // address
      searchPattern  // phone_number
    ]

    let params = [...baseParams]
    let dateCondition = ''
    
    if (date) {
      dateCondition = "AND DATE(o.created_at) = DATE(?)"
      params.push(date)
    }

    // WITH 절을 사용하여 한 번의 쿼리로 처리
    const stmt = db.prepare(`
      WITH PagedData AS (
        SELECT 
          o.*,
          pm.product_name,
          COUNT(*) OVER() as total_count
        FROM orders o
        LEFT JOIN product_master pm ON o.sku = pm.product_code
        WHERE (
          o.reference_no LIKE ? OR
          o.sku LIKE ? OR
          o.consignee_name LIKE ? OR
          o.postal_code LIKE ? OR
          o.address LIKE ? OR
          o.phone_number LIKE ?
        )
        ${dateCondition}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      )
      SELECT * FROM PagedData
    `)

    const orders = stmt.all(...params, limit, offset)
    const total = orders.length > 0 ? orders[0].total_count : 0

    return NextResponse.json({
      data: orders.map(({ total_count, ...order }) => order),
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
          reference_no,
          sku,
          original_product_name,
          quantity,
          unit_value,
          consignee_name,
          kana,
          postal_code,
          address,
          phone_number,
          sales_site
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              order.phone_number,
              order.sales_site
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