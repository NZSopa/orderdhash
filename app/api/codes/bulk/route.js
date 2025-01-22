import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function POST(request) {
  try {
    const { codes } = await request.json()

    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ success: false, error: '유효하지 않은 데이터입니다.' }, { status: 400 })
    }

    return await withDB(async (db) => {
      db.prepare('BEGIN TRANSACTION').run()

      try {
        for (const code of codes) {
          const {
            sales_code,
            product_name,
            set_qty = 1,
            product_code,
            sales_price = 0,
            weight = 0,
            sales_site,
            site_url,
            shipping_country = 'nz'
          } = code

          // 필수 필드 검증
          if (!sales_code || !product_name || !product_code) {
            throw new Error('판매 코드와 제품 코드와 상품명은 필수 입력 항목입니다.')
          }

          // shipping_country 검증
          if (shipping_country && !['aus', 'nz'].includes(shipping_country.toLowerCase())) {
            throw new Error('현재는 발송 출발 국가는 aus 또는 nz만 가능합니다.')
          }

          // 기존 코드 확인
          const existingCode = db.prepare(
            'SELECT sales_code FROM sales_listings WHERE sales_code = ?'
          ).get(sales_code)

          if (existingCode) {
            // 기존 코드 업데이트
            db.prepare(`
              UPDATE sales_listings 
              SET product_name = ?, set_qty = ?, product_code = ?, sales_price = ?,
                  weight = ?, sales_site = ?, site_url = ?, shipping_country = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE sales_code = ?
            `).run(
              product_name, set_qty, product_code, sales_price,
              weight, sales_site, site_url,
              shipping_country ? shipping_country.toLowerCase() : null,
              sales_code
            )
          } else {
            // 새 코드 추가
            db.prepare(`
              INSERT INTO sales_listings 
              (sales_code, product_name, set_qty, product_code, sales_price,
               weight, sales_site, site_url, shipping_country)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              sales_code, product_name, set_qty, product_code, sales_price,
              weight, sales_site, site_url,
              shipping_country ? shipping_country.toLowerCase() : null
            )
          }
        }

        db.prepare('COMMIT').run()
        return NextResponse.json({ success: true })
      } catch (error) {
        db.prepare('ROLLBACK').run()
        throw error
      }
    })
  } catch (error) {
    console.error('Error in bulk upload:', error)
    return NextResponse.json(
      { success: false, error: error.message || '업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 