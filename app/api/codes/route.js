import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function GET(request) {
  try {
    return await withDB(async (db) => {
      const { searchParams } = new URL(request.url)
      const query = searchParams.get('query')
      const page = parseInt(searchParams.get('page')) || 1
      const limit = parseInt(searchParams.get('limit')) || 20
      const sortField = searchParams.get('sortField') || 'sales_code'
      const sortOrder = searchParams.get('sortOrder') || 'asc'
      const offset = (page - 1) * limit

      // 정렬 필드 유효성 검사
      const validSortFields = [
        'sales_code', 'product_name', 'set_qty', 'product_code', 
        'sales_price', 'weight', 'sales_site', 'shipping_country',
        'created_at', 'updated_at'
      ]
      const actualSortField = validSortFields.includes(sortField) ? sortField : 'sales_code'

      let whereClause = ''
      const params = []

      if (query) {
        whereClause = `
          WHERE sales_code LIKE ? 
          OR product_name LIKE ? 
          OR product_code LIKE ?
          OR sales_site LIKE ?
        `
        params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`)
      }

      const stmt = db.prepare(`
        WITH PagedData AS (
          SELECT 
            id,
            sales_code,
            product_name,
            set_qty,
            product_code,
            sales_price,
            weight,
            sales_site,
            site_url,
            shipping_country,
            created_at,
            updated_at,
            COUNT(*) OVER() as total_count
          FROM sales_listings 
          ${whereClause}
          ORDER BY ${actualSortField} ${sortOrder}
          LIMIT ? OFFSET ?
        )
        SELECT * FROM PagedData
      `)

      const codes = stmt.all(...params, limit, offset)
      const total = codes.length > 0 ? codes[0].total_count : 0

      return NextResponse.json({
        success: true,
        data: codes.map(({ total_count, ...code }) => code),
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      })
    })
  } catch (error) {
    console.error('Error fetching codes:', error)
    return NextResponse.json(
      { success: false, error: '코드 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/codes
export async function POST(request) {
  try {
    const body = await request.json()
    
    return await withDB(async (db) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO sales_listings (
          sales_code, product_name, set_qty, product_code,
          sales_price, weight, sales_site, site_url, shipping_country,
          updated_at, created_at
        ) VALUES (
          @sales_code, @product_name, @set_qty, @product_code,
          @sales_price, @weight, @sales_site, @site_url, @shipping_country,
          CURRENT_TIMESTAMP,
          COALESCE((SELECT created_at FROM sales_listings WHERE sales_code = @sales_code), CURRENT_TIMESTAMP)
        )
      `)

      if (body.codes) {
        // 일괄 저장
        const insertMany = db.transaction((items) => {
          for (const item of items) {
            stmt.run(item)
          }
        })
        insertMany(body.codes)
      } else if (body.code) {
        // 단일 코드 저장
        stmt.run(body.code)
      } else {
        return NextResponse.json(
          { error: '저장할 데이터가 없습니다.' },
          { status: 400 }
        )
      }

      return NextResponse.json({ 
        message: '코드가 저장되었습니다.',
        success: true 
      })
    })
  } catch (error) {
    console.error('Error saving product code:', error)
    return NextResponse.json(
      { error: '코드 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/codes
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const productCode = searchParams.get('product_code')
    const salesCode = searchParams.get('sales_code')
    const action = searchParams.get('action')
    const answer = searchParams.get('answer')
    const userAnswer = searchParams.get('userAnswer')
    
    return await withDB(async (db) => {
      if (action === 'deleteAll') {
        if (!answer || !userAnswer) {
          return NextResponse.json(
            { error: '수식 답변이 필요합니다.' },
            { status: 400 }
          )
        }

        if (answer !== userAnswer) {
          return NextResponse.json(
            { error: '수식이 올바르지 않습니다. 다시 시도해주세요.' },
            { status: 400 }
          )
        }

        db.prepare('DELETE FROM sales_listings').run()
        return NextResponse.json({ 
          message: '모든 코드가 삭제되었습니다.',
          success: true 
        })
      }
      
      if (!productCode && !salesCode) {
        return NextResponse.json(
          { error: '삭제할 코드가 필요합니다.' },
          { status: 400 }
        )
      }

      if (productCode) {
        db.prepare('DELETE FROM sales_listings WHERE product_code = ?').run(productCode)
      } else {
        db.prepare('DELETE FROM sales_listings WHERE sales_code = ?').run(salesCode)
      }

      return NextResponse.json({ 
        message: '코드가 삭제되었습니다.',
        success: true 
      })
    })
  } catch (error) {
    console.error('Error deleting product code:', error)
    return NextResponse.json(
      { error: '코드 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 