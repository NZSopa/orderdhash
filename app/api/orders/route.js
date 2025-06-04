import { NextResponse } from 'next/server'
import { getDB, withDB } from '@/app/lib/db'
import { parseDate } from '@/app/lib/date'
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const location = searchParams.get('location') || 'all'

    let whereClause = 'WHERE 1=1'
    const params = []

    whereClause += ` AND (o.status = 'ordered')`

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

    if (location !== 'all') {
      whereClause += ` AND o.shipment_location = ?`
      params.push(location)
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
        o.quantity, o.consignee_name, o.kana,
        o.postal_code, o.address, o.phone_number, o.created_at,
        o.status, o.updated_at, o.product_code, o.product_name,
        o.sales_price, o.sales_site, o.site_url, o.shipment_location,
        o.set_qty, o.weight, o.shipment_batch,
        CASE 
          WHEN o.shipment_location LIKE 'aus%' THEN i.aus_stock
          ELSE i.nz_stock
        END as current_stock
      FROM orders o
      LEFT JOIN inventory i ON o.product_code = i.product_code
      ${whereClause}
      ORDER BY o.created_at DESC, o.shipment_batch
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset)

    return NextResponse.json({
      data: orders,
      total: countResult.total,
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
}

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      // 요청 데이터를 UTF-8로 디코딩
      const buffer = await request.arrayBuffer()
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(buffer)
      const orders = JSON.parse(text)

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        const stmt = db.prepare(`
          INSERT INTO orders (
            reference_no,
            order_date,
            sales_site,
            shipment_location,
            sku,
            product_code,
            product_name,
            quantity,
            sales_price,
            consignee_name,
            kana,
            postal_code,
            address,
            phone_number,
            weight,
            set_qty,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)

        for (const order of orders) {
          stmt.run([
            order.reference_no,
            parseDate(order.order_date),
            order.sales_site,
            order.shipment_location,
            order.sku,
            order.product_code,
            order.product_name,
            order.quantity,
            order.sales_price,
            order.consignee_name,
            order.kana || '',
            order.postal_code,
            order.address,
            order.phone_number,
            order.weight,
            order.set_qty || 1
          ])
        }

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ 
          success: true,
          message: `${orders.length}건의 주문이 등록되었습니다.`
        })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error creating orders:', error)
      return NextResponse.json(
        { error: '주문 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
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
    const { id, shipment_location, kana } = await request.json()
    
    if (!id || (!shipment_location && kana === undefined)) {
      return NextResponse.json(
        { error: '주문번호와 수정할 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    const db = await getDB()
    
    // 주문 정보 업데이트
    let updateFields = []
    let params = []

    if (shipment_location) {
      updateFields.push('shipment_location = ?')
      params.push(shipment_location)
    }

    if (kana !== undefined) {
      updateFields.push('kana = ?')
      params.push(kana)
    }

    // updateFields.push('updated_at = datetime("now")')
    params.push(id)

    const result = db.prepare(`
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(params)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: '해당 주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '주문 정보가 성공적으로 수정되었습니다.'
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