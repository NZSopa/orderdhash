import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'
import Papa from 'papaparse'
import { parseDate } from '@/app/lib/date'

export async function POST(request) {
  try {
    const db = getDB()
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    const text = await file.text()
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })

    // 현재 날짜시간으로 upload_id 생성 (Amazon_YYYYMMDD_HHMMSS 형식)
    const now = new Date()
    const upload_id = `NZPJP_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

    // 트랜잭션 시작
    await db.exec('BEGIN TRANSACTION')

    try {
      // 업데이트 또는 삽입을 위한 prepared statement
      const updateStmt = db.prepare(`
        UPDATE order_summary SET
          order_date = ?,
          settlement_type = ?,
          product_original_name = ?,
          sales_price = ?,
          amazon_fee = ?,
          deposit_amount_jpy = ?,
          sales_site = ?,
          upload_id = ?
        WHERE order_id = ?
      `)

      const insertStmt = db.prepare(`
        INSERT INTO order_summary (
          order_date, settlement_type, order_id,
          product_original_name, sales_price, amazon_fee,
          deposit_amount_jpy, sales_site, upload_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      let updatedCount = 0
      let insertedCount = 0

      for (const row of data) {
        // Amazon CSV 데이터를 DB 형식으로 변환
        const orderData = {
          order_date: parseDate(row['Date']),
          settlement_type: row['Transaction type'],
          order_id: row['Order ID'],
          product_original_name: row['Product Details'],
          sales_price: parseInt(row['Total product charges'].replace(/[^0-9]/g, '')) + parseInt(row['Other']?.replace(/[^0-9]/g, '') || '0') || 0,
          amazon_fee: parseFloat(row['Amazon fees'].replace(/[^0-9]/g, '')) || 0,
          deposit_amount_jpy: parseFloat(row['Total (JPY)'].replace(/[^0-9]/g, '')) || 0,
          sales_site: 'NZP',
        }

        // 기존 주문 확인
        const existingOrder = db.prepare('SELECT order_id FROM order_summary WHERE order_id = ?').get(orderData.order_id)

        if (existingOrder) {
          // 기존 주문 업데이트
          updateStmt.run(
            orderData.order_date,
            orderData.settlement_type,
            orderData.product_original_name,
            orderData.sales_price,
            orderData.amazon_fee,
            orderData.deposit_amount_jpy,
            orderData.sales_site,
            upload_id,
            orderData.order_id
          )
          updatedCount++
        } else {
          // 새 주문 삽입
          insertStmt.run(
            orderData.order_date,
            orderData.settlement_type,
            orderData.order_id,
            orderData.product_original_name,
            orderData.sales_price,
            orderData.amazon_fee,
            orderData.deposit_amount_jpy,
            orderData.sales_site,
            upload_id
          )
          insertedCount++
        }
      }

      // 트랜잭션 커밋
      await db.exec('COMMIT')

      return NextResponse.json({ 
        message: `Amazon Statement 파일이 성공적으로 처리되었습니다. (신규: ${insertedCount}건, 업데이트: ${updatedCount}건)`,
        upload_id
      })

    } catch (error) {
      // 오류 발생 시 롤백
      await db.exec('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error uploading Amazon orders:', error)
    return NextResponse.json({ 
      error: 'Amazon 주문 업로드 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 