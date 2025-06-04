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
function isDuplicateOrder(db, referenceNo) {
  const existing = db.prepare(`
    SELECT id FROM orders 
    WHERE reference_no = ? AND status = 'preparing'
  `).get(referenceNo)
  
  return !!existing
}

// 수취인 중복 확인 함수
function checkDuplicateConsignee(db, consigneeName) {
  const duplicates = db.prepare(`
    SELECT id 
    FROM orders 
    WHERE consignee_name = ? 
    AND status = 'preparing'
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
      let whereClause = "WHERE status = 'preparing'"
      const params = []

      if (search) {
        whereClause += `
          AND (reference_no LIKE ? OR 
               product_code LIKE ? OR 
               product_name LIKE ? OR
               consignee_name LIKE ?)
        `
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }

      if (location !== 'all') {
        whereClause += " AND shipment_location = ?"
        params.push(location)
      }

      // 전체 건수 조회
      const countStmt = db.prepare(`
        SELECT COUNT(*) as total
        FROM orders
        ${whereClause}
      `)
      const { total } = countStmt.get(...params)

      // 출하 목록 조회
      const stmt = db.prepare(`
        SELECT *
        FROM orders
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      
      const data = stmt.all(...params, limit, offset)

      return NextResponse.json({
        data,
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
        // 주문 상태를 'preparing'으로 업데이트
        const updateStmt = db.prepare(`
          UPDATE orders 
          SET status = 'preparing',
              updated_at = datetime('now')
          WHERE id = ?
        `)

        const updateMany = db.transaction((orders) => {
          for (const order of orders) {
            updateStmt.run(order.id)
          }
        })

        updateMany(orders)

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ 
          success: true,
          message: `${orders.length}건의 주문이 출하 준비 상태로 변경되었습니다.`
        })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error updating orders to preparing:', error)
      return NextResponse.json(
        { error: '출하 준비 상태 변경 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
}

export async function PUT(request) {
  return await withDB(async (db) => {
    try {
      const body = await request.json()
      const { id, shipmentIds, shipment_no, field, value } = body
      console.log("PUT request body:", body)

      // 단일 필드 업데이트인 경우
      if (field && value) {
        const stmt = db.prepare(`
          UPDATE orders 
          SET ${field} = ?, 
              updated_at = datetime('now')
          WHERE id = ?
        `)
        const result = stmt.run(value, id)

        if (result.changes === 0) {
          return NextResponse.json({ error: '출하 정보가 없습니다.' }, { status: 404 })
        }

        return NextResponse.json({ message: '수정이 완료되었습니다.' })
      }

      // 출하번호 업데이트인 경우
      if (shipment_no) {
        let query
        let params

        // 트랜잭션 시작
        db.prepare('BEGIN TRANSACTION').run()

        try {
          if (id) {
            // 단일 ID 업데이트
            query = `
              UPDATE orders 
              SET shipment_no = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `
            params = [shipment_no, id]
            console.log('Single update - Query:', query, 'Params:', params)
          } else if (shipmentIds && Array.isArray(shipmentIds)) {
            // 다중 ID 업데이트 (합배송)
            query = `
              UPDATE orders 
              SET shipment_no = ?,
                  updated_at = datetime('now')
              WHERE id IN (${shipmentIds.map(() => '?').join(',')})
            `
            params = [shipment_no, ...shipmentIds]
            console.log('Batch update - Query:', query, 'Params:', params)
          } else {
            console.log('Invalid request - Body:', body)
            throw new Error('유효하지 않은 요청입니다.')
          }

          const stmt = db.prepare(query)
          const result = stmt.run(...params)
          console.log('Update result:', result)

          if (result.changes === 0) {
            console.log('No rows updated')
            db.prepare('ROLLBACK').run()
            return NextResponse.json({ error: '출하 정보가 없습니다.' }, { status: 404 })
          }

          // 트랜잭션 커밋
          db.prepare('COMMIT').run()
          return NextResponse.json({ 
            message: '출하번호가 업데이트되었습니다.',
            changes: result.changes
          })
        } catch (error) {
          console.error('Error in shipment update:', error)
          // 오류 발생 시 롤백
          db.prepare('ROLLBACK').run()
          throw error
        }
      }

      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    } catch (error) {
      console.error('Error in PUT /api/shipment:', error)
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }
  })
} 