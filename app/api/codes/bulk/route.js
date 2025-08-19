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
            sales_sku,
            sales_product_name,
            sales_qty = 0,
            set_qty = 1,
            product_code,
            sales_price = 0,
            weight = 0,
            sales_site,
            site_url,
            shipping_country = 'nz'
          } = code

          // 필수 필드 검증
          if (!sales_code || !product_code) {
            throw new Error('판매 코드와 제품 코드는 필수 입력 항목입니다.')
          }

          // shipping_country 검증
          if (shipping_country && !['aus', 'nz'].includes(shipping_country.toLowerCase())) {
            throw new Error('현재는 발송 출발 국가는 aus 또는 nz만 가능합니다.')
          }

          // product_name을 product_master에서 가져오기
          const productMaster = db.prepare(
            'SELECT product_name FROM product_master WHERE product_code = ?'
          ).get(product_code)
          if (!productMaster) {
            throw new Error(`product_master에 해당 제품 코드(${product_code})가 존재하지 않습니다.`)
          }
          let product_name = productMaster.product_name
          if (Number(set_qty) >= 2) {
            product_name = `${product_name} ${set_qty} SETS`
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
                  weight = ?, sales_site = ?, site_url = ?, shipping_country = ?, sales_qty = ?, sales_sku = ?, sales_product_name = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE sales_code = ?
            `).run(
              product_name, set_qty, product_code, sales_price,
              weight, sales_site, site_url,
              shipping_country ? shipping_country.toLowerCase() : null,
              0,
              sales_sku,
              sales_product_name,
              sales_code
            )
          } else {
            // 새 코드 추가
            db.prepare(`
              INSERT INTO sales_listings 
              (sales_code, product_name, set_qty, product_code, sales_price,
               weight, sales_site, site_url, shipping_country, sales_qty, sales_sku, sales_product_name)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              sales_code, product_name, set_qty, product_code, sales_price,
              weight, sales_site, site_url,
              shipping_country ? shipping_country.toLowerCase() : null,
              0, sales_sku, sales_product_name
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