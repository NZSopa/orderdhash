import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getDB } from '@/app/lib/db'

export async function POST(request) {
  try {
    const { data } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: '유효하지 않은 데이터입니다.' },
        { status: 400 }
      )
    }

    // 엑셀 워크북 생성
    const wb = XLSX.utils.book_new()
    
    // 데이터를 워크시트로 변환
    const ws = XLSX.utils.json_to_sheet(data)

    // 열 너비 설정
    const colWidths = {
      A: 15, // reference No.
      B: 10, // sku
      C: 30, // product-name
      D: 8,  // quantity
      E: 20, // Consignees NAME
      F: 15, // Kana
      G: 10, // ConsigneesPOST
      H: 40, // Consignees Address
      I: 15, // ConsigneesPhonenumber
    }

    ws['!cols'] = Object.values(colWidths).map(width => ({ width }))

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')

    // 엑셀 파일 생성
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // 응답 헤더 설정
    const headers = new Headers()
    headers.append('Content-Disposition', `attachment; filename=JapanOrder_${new Date().toISOString().split('T')[0]}.xlsx`)
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    return new Response(buffer, {
      headers,
    })
  } catch (error) {
    console.error('Error generating Excel file:', error)
    return NextResponse.json(
      { error: '파일 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: '날짜를 지정해주세요.' }, { status: 400 })
    }

    const db = await getDB()
    
    const orders = db.prepare(`
      SELECT reference_no, consignee_name, kana
      FROM orders
      WHERE DATE(substr(created_at, 1, 10)) = DATE(?)
      ORDER BY created_at ASC
    `).all(date)

    // CSV 헤더
    let csv = 'reference_no,consignee_name,kana\n'
    
    // CSV 데이터 생성
    orders.forEach(order => {
      csv += `${order.reference_no},"${order.consignee_name}","${order.kana || ''}"\n`
    })

    // UTF-8 BOM 추가
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csv

    // CSV 파일 다운로드를 위한 헤더 설정
    const headers = {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=orders_${date}.csv`
    }

    // UTF-8로 인코딩된 Uint8Array 생성
    const encoder = new TextEncoder()
    const data = encoder.encode(csvWithBOM)

    return new Response(data, { headers })

  } catch (error) {
    console.error('Error downloading orders:', error)
    return NextResponse.json(
      { error: '주문 데이터 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 