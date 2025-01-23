import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

// 재고 확인 함수
async function checkInventory(db, productCode, location) {
  const stockField = location.startsWith('nz_') ? 'nz_stock' : 'aus_stock'
  
  const inventory = db.prepare(`
    SELECT ${stockField} as quantity
    FROM inventory
    WHERE product_code = ?
  `).get(productCode)

  return inventory ? inventory.quantity : 0
}

// 중복 주문 확인 함수
async function checkDuplicateOrder(db, referenceNo) {
  const existing = db.prepare(`
    SELECT id FROM shipment WHERE order_id = ?
  `).get(referenceNo)
  
  return !!existing
}

// 수취인 중복 확인 함수
async function checkDuplicateConsignee(db, consigneeName) {
  const duplicates = db.prepare(`
    SELECT order_id 
    FROM shipment 
    WHERE consignee_name = ? 
    AND status = 'processing'
  `).all(consigneeName)
  
  return duplicates.length > 0
}

export async function GET(request) {
  return await withDB(async (db) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page')) || 1
      const limit = parseInt(searchParams.get('limit')) || 20
      const search = searchParams.get('search') || ''
      const location = searchParams.get('location') || 'all'
      const offset = (page - 1) * limit

      // 검색 및 위치 조건
      let conditions = []
      let params = []

      if (search) {
        conditions.push('(shipment_no LIKE ? OR reference_no LIKE ? OR sku LIKE ?)')
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
      }

      if (location !== 'all') {
        conditions.push('shipment_location = ?')
        params.push(location)
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

      // 전체 개수 조회
      const countQuery = db.prepare(`
        SELECT COUNT(*) as count 
        FROM shipment 
        ${whereClause}
      `)
      
      const { count } = countQuery.get(...params)

      // 데이터 조회
      const query = db.prepare(`
        SELECT * 
        FROM shipment 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)

      const data = query.all(...params, limit, offset)

      return NextResponse.json({
        data,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      })
    } catch (error) {
      console.error('Error fetching shipments:', error)
      return NextResponse.json(
        { error: '출하 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
}

export async function POST(req) {
  return await withDB(async (db) => {
    try {
      const orders = await req.json()
      const results = []

      for (const order of orders) {
        // sales_listings와 product_master에서 제품 정보 조회
        const product = db.prepare(`
          SELECT 
            sl.product_code,
            sl.set_qty,
            sl.shipping_country,
            pm.shipping_from
          FROM sales_listings sl
          LEFT JOIN product_master pm ON sl.product_code = pm.product_code
          WHERE sl.sales_code = ?
        `).get(order.sku)

        if (!product) {
          throw new Error(`상품 코드 ${order.sku}에 대한 정보를 찾을 수 없습니다.`)
        }

        if (!product.shipping_from) {
          throw new Error(`상품 코드 ${order.sku}의 출하 위치 정보가 없습니다.`)
        }

        // 재고 확인
        const stock = await checkInventory(db, product.product_code, product.shipping_from)
        const orderQuantity = order.quantity * product.set_qty // 실제 주문 수량 (세트 수량 * 주문 수량)
        const isLowInventory = stock < orderQuantity

        // 수취인 중복 확인
        const hasDuplicateConsignee = await checkDuplicateConsignee(db, order.consignee_name)
        
        // 금액 체크
        const totalAmount = order.quantity * order.unit_value
        const needsPriceCheck = totalAmount >= 16500

        results.push({
          order,
          needs_human_check: isLowInventory || hasDuplicateConsignee || needsPriceCheck,
          shipping_from: product.shipping_from,
          current_stock: stock,
          required_stock: orderQuantity,
          set_qty: product.set_qty,
          total_quantity: orderQuantity,
          reason: {
            low_inventory: isLowInventory,
            duplicate_consignee: hasDuplicateConsignee,
            high_price: needsPriceCheck
          }
        })
      }

      return NextResponse.json({ results })
    } catch (error) {
      console.error('Error processing shipment:', error)
      return NextResponse.json(
        { error: error.message || '출하 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 