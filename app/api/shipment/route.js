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

// 중복 주문 확인 함수 - 단순 체크만 수행
function isDuplicateOrder(db, referenceNo, sku) {
  const existing = db.prepare(`
    SELECT id FROM shipment 
    WHERE reference_no = ? AND sku = ?
  `).get(referenceNo, sku)
  
  return !!existing
}

// 수취인 중복 확인 함수
function checkDuplicateConsignee(db, consigneeName) {
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

      // 검색 조건 설정
      let whereClause = ''
      const params = []

      if (search) {
        whereClause = `
          AND (s.shipment_no LIKE ? OR s.reference_no LIKE ? OR 
               s.product_name LIKE ? OR s.consignee_name LIKE ?)
        `
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }

      if (location !== 'all') {
        whereClause += ` AND s.shipment_location = ?`
        params.push(location)
      }

      // 전체 건수 조회
      const countStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM shipment s
        WHERE 1=1 ${whereClause}
      `)
      const { total } = countStmt.get(...params)

      // 출하 목록 조회
      const stmt = db.prepare(`
        SELECT s.*
        FROM shipment s
        WHERE 1=1 ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `)
      
      const shipments = stmt.all(...params, limit, offset)

      return NextResponse.json({
        data: shipments,
        total,
        page,
        limit
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

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const orders = await request.json()

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        const stmt = db.prepare(`
          INSERT INTO shipment (
            shipment_location,
            reference_no,
            status,
            sku,
            product_code,
            product_name,
            quantity,
            unit_value,
            consignee_name,
            kana,
            postal_code,
            address
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const insertMany = db.transaction((orders) => {
          for (const order of orders) {
            // 제품 정보 조회
            const product = db.prepare(`
              SELECT 
                sl.product_code,
                sl.set_qty,
                pm.shipping_from
              FROM sales_listings sl
              LEFT JOIN product_master pm ON sl.product_code = pm.product_code
              WHERE sl.sales_code = ?
            `).get(order.sku)

            // 출하번호 생성
            const date = new Date()
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
            // const shipmentNo = `SH${year}${month}${day}${random}`

            stmt.run([
              product?.shipping_from || order.shipping_from || 'n/a',
              order.reference_no,
              'processing',
              order.sku,
              product?.product_code || '',
              order.product_name,
              order.quantity,
              order.unit_value,
              order.consignee_name,
              order.kana,
              order.postal_code,
              order.address
            ])
          }
        })

        insertMany(orders)

        // 주문 상태 업데이트
        const updateOrdersStmt = db.prepare(`
          UPDATE orders 
          SET status = CASE 
            WHEN status IS NULL OR status = '' THEN 'sh'
            ELSE status || 'sh'
          END,
          updated_at = datetime('now')
          WHERE reference_no IN (${orders.map(() => '?').join(',')})
        `)
        updateOrdersStmt.run(orders.map(order => order.reference_no))

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ 
          success: true,
          message: `${orders.length}건의 출하가 등록되었습니다.`
        })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error creating shipments:', error)
      return NextResponse.json(
        { error: '출하 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 