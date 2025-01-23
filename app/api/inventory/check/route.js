import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function GET(request) {
  return await withDB(async (db) => {
    try {
      const { searchParams } = new URL(request.url)
      const productCode = searchParams.get('product_code')
      const location = searchParams.get('location')

      if (!productCode || !location) {
        return NextResponse.json(
          { error: '제품 코드와 위치 정보가 필요합니다.' },
          { status: 400 }
        )
      }

      // 위치에 따른 재고 필드 결정
      const stockField = location.toLowerCase().startsWith('aus') ? 'aus_stock' : 'nz_stock'

      // 재고 조회
      const inventory = db.prepare(`
        SELECT ${stockField} as current_stock
        FROM inventory
        WHERE product_code = ?
      `).get(productCode)

      return NextResponse.json({
        productCode,
        location,
        currentStock: inventory ? inventory.current_stock : 0
      })
    } catch (error) {
      console.error('Error checking inventory:', error)
      return NextResponse.json(
        { error: '재고 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 