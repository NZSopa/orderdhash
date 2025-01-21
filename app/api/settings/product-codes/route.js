import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

// 제품 코드 목록 조회
export async function GET(request) {
  let db = null
  try {
    db = getDB()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    let whereClause = ''
    const params = []

    if (search) {
      whereClause = `
        WHERE product_code LIKE ? OR 
              product_name LIKE ? OR 
              COALESCE(brand, '') LIKE ? OR 
              COALESCE(supplier, '') LIKE ?
      `
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    // 데이터 조회 (WITH 절을 사용하여 한 번의 쿼리로 처리)
    const stmt = db.prepare(`
      WITH PagedData AS (
        SELECT 
          product_code,
          product_name,
          brand,
          supplier,
          image_url,
          description,
          barcode,
          created_at,
          updated_at,
          COUNT(*) OVER() as total_count
        FROM product_master
        ${whereClause}
        ORDER BY product_code
        LIMIT ? OFFSET ?
      )
      SELECT * FROM PagedData
    `)

    const codes = stmt.all(...params, limit, offset)
    const total = codes.length > 0 ? codes[0].total_count : 0

    return NextResponse.json({
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: codes.map(({ total_count, ...code }) => code)
    })
  } catch (error) {
    console.error('Error fetching product codes:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 제품 코드 추가
export async function POST(request) {
  let db = null
  try {
    db = getDB()
    const body = await request.json()
    const { product_code, product_name, brand, supplier, image_url, description, barcode } = body

    // 중복 체크
    const existing = db.prepare('SELECT product_code FROM product_master WHERE product_code = ?')
      .get(product_code)
    
    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 제품 코드입니다.' },
        { status: 400 }
      )
    }

    // 제품 마스터 테이블에 삽입
    db.prepare(`
      INSERT INTO product_master (
        product_code, 
        product_name, 
        brand, 
        supplier, 
        image_url, 
        description, 
        barcode
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(product_code, product_name, brand, supplier, image_url, description, barcode)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating product code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 제품 코드 수정
export async function PUT(request) {
  let db = null
  try {
    db = getDB()
    const body = await request.json()
    const { product_code, product_name, brand, supplier, image_url, description, barcode } = body

    // 제품 마스터 테이블 업데이트
    db.prepare(`
      UPDATE product_master
      SET 
        product_name = ?,
        brand = ?,
        supplier = ?,
        image_url = ?,
        description = ?,
        barcode = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE product_code = ?
    `).run(product_name, brand, supplier, image_url, description, barcode, product_code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating product code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 제품 코드 삭제
export async function DELETE(request) {
  let db = null
  try {
    db = getDB()
    const { searchParams } = new URL(request.url)
    const productCode = searchParams.get('product_code')

    // 제품 마스터 테이블에서 삭제
    db.prepare('DELETE FROM product_master WHERE product_code = ?')
      .run(productCode)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 