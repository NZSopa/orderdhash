import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

// 데이터베이스 작업을 위한 헬퍼 함수
async function withDBConnection(operation) {
  let db = null
  try {
    db = getDB()
    return await operation(db)
  } finally {
    if (db) {
      db.close()
    }
  }
}

export async function GET(request, context) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json(
        { error: '제품 코드가 필요합니다.' },
        { status: 400 }
      );
    }

    return await withDB(async (db) => {
      // 제품 마스터 테이블에서 조회
      const result = db.prepare('SELECT * FROM product_master WHERE product_code = ?').get(code)

      if (!result) {
        return NextResponse.json(
          { error: '해당 제품 코드를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(result)
    })
  } catch (error) {
    console.error('Error retrieving product code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request, context) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json(
        { error: '제품 코드가 필요합니다.' },
        { status: 400 }
      );
    }

    const body = await request.json()
    const { 
      product_name, 
      brand, 
      supplier, 
      image_url, 
      description, 
      barcode, 
      shipping_from 
    } = body

    return await withDB(async (db) => {
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
          shipping_from = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE product_code = ?
      `).run(
        product_name, 
        brand, 
        supplier, 
        image_url, 
        description, 
        barcode, 
        shipping_from, 
        code
      )

      return NextResponse.json({ success: true })
    })
  } catch (error) {
    console.error('Error updating product code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json(
        { error: '제품 코드가 필요합니다.' },
        { status: 400 }
      );
    }

    return await withDB(async (db) => {
      // 제품 마스터 테이블에서 삭제
      db.prepare('DELETE FROM product_master WHERE product_code = ?')
        .run(code)

      return NextResponse.json({ success: true })
    })
  } catch (error) {
    console.error('Error deleting product code:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 