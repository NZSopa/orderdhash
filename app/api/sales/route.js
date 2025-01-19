import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20
  const offset = (page - 1) * limit
  const sortField = searchParams.get('sortField') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const search = searchParams.get('search') || ''

  try {
    const db = getDB()
    
    let whereClause = ''
    const params = []
    if (search) {
      whereClause = `
        WHERE s.site_sku LIKE ? 
        OR s.product_code LIKE ? 
        OR pc.product_name LIKE ?
      `
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    // 전체 데이터 수 조회
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Sales s
      LEFT JOIN Product_Codes pc ON s.product_code = pc.product_code
      ${whereClause}
    `
    const { total } = db.prepare(countQuery).get(...params)

    // 판매 데이터 조회 쿼리
    const query = `
      SELECT 
        s.*,
        pc.product_name,
        pc.weight,
        pu.price as unit_price,
        i.nz_stock,
        i.aus_stock
      FROM Sales s
      LEFT JOIN Product_Codes pc ON s.product_code = pc.product_code
      LEFT JOIN Products_UnitPrice pu ON s.product_code = pu.product_code
        AND pu.year_month = strftime('%Y%m', 'now')
      LEFT JOIN Inventory i ON s.product_code = i.product_code
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `
    
    const data = db.prepare(query).all(...params, limit, offset)

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '판매 데이터 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const db = getDB()
    const body = await request.json()
    
    const stmt = db.prepare(`
      INSERT INTO Sales (
        site_sku,
        product_code,
        sales_price,
        qty,
        sales_channel,
        shipping_from,
        shipping_fee,
        set_qty
      ) VALUES (
        @site_sku,
        @product_code,
        @sales_price,
        @qty,
        @sales_channel,
        @shipping_from,
        @shipping_fee,
        @set_qty
      )
    `)

    if (Array.isArray(body.sales)) {
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          stmt.run(item)
        }
      })
      insertMany(body.sales)
    } else {
      stmt.run(body)
    }

    return NextResponse.json({ 
      success: true,
      message: '판매 데이터가 저장되었습니다.'
    })
  } catch (error) {
    console.error('Error saving sales:', error)
    return NextResponse.json(
      { success: false, error: '판매 데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const db = getDB()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '삭제할 판매 데이터의 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const result = db.prepare('DELETE FROM Sales WHERE id = ?').run(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: '삭제할 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: '판매 데이터가 삭제되었습니다.'
    })
  } catch (error) {
    console.error('Error deleting sale:', error)
    return NextResponse.json(
      { error: '판매 데이터 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 