import { NextResponse } from 'next/server'
import { getDB, withDB } from '../../lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereClause = 'WHERE 1=1'
    const params = []

    if (search) {
      whereClause += ` AND (
        o.reference_no LIKE ? OR 
        o.consignee_name LIKE ? OR 
        o.sku LIKE ? OR 
        o.product_name LIKE ?
      )`
      params.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      )
    }

    if (startDate && endDate) {
      whereClause += ` AND DATE(substr(o.created_at, 1, 10)) BETWEEN DATE(?) AND DATE(?)`
      params.push(startDate, endDate)
    }

    const db = await getDB()
    
    // 전체 개수 조회
    const countResult = db.prepare(`
      SELECT COUNT(*) as total 
      FROM orders o
      ${whereClause}
    `).get(...params)

    // 데이터 조회
    const offset = (page - 1) * limit
    const orders = db.prepare(`
      SELECT 
        o.id, o.reference_no, o.sku, o.original_product_name,
        o.quantity,  o.consignee_name, o.kana,
        o.postal_code, o.address, o.phone_number, o.created_at,
        o.status, o.updated_at, o.product_code, o.product_name,
        o.sales_price, o.sales_site, o.site_url, o.shipment_location,
        CASE 
          WHEN o.shipment_location LIKE 'aus%' THEN i.aus_stock
          ELSE i.nz_stock
        END as current_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset)

    return NextResponse.json({
      data: orders,
      total: countResult.total,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in orders API:', error)
    return NextResponse.json({ error: '주문 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 })
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
          consignee_name,
          kana,
          postal_code,
          address,
          phone_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      try {
        const insertMany = db.transaction((orders) => {
          for (const order of orders) {
            stmt.run([
              order.reference_no,
              order.sku,
              order.original_product_name,
              order.quantity,
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

export async function PUT(request) {
  try {
    const { reference_no, shipment_location } = await request.json()
    
    if (!reference_no || !shipment_location) {
      return NextResponse.json(
        { error: '주문번호와 출고지 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    const db = await getDB()
    
    // 주문 정보 업데이트
    const result = db.prepare(`
      UPDATE orders 
      SET 
        shipment_location = ?,
        updated_at = datetime('now')
      WHERE reference_no = ?
    `).run(shipment_location, reference_no)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: '해당 주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '출고지가 성공적으로 수정되었습니다.'
    })

  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: '주문 정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

const deleteQuery = `
  DELETE FROM orders WHERE reference_no = ?
` 