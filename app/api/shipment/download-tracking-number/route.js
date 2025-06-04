import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'
import * as XLSX from 'xlsx'

const today = new Date();
const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    if (!location || location === 'all') {
      return NextResponse.json(
        { error: '출하 위치를 선택해주세요.' },
        { status: 400 }
      )
    }

    const db = await getDB()
    
    // 출하 데이터 조회
    const shipments = db.prepare(`
      SELECT 
        o.reference_no,
        o.shipment_no,
        o.product_code,
        o.product_name,
        o.quantity,
        o.set_qty,
        o.memo
      FROM orders o
      WHERE o.shipment_no IS NOT NULL
      AND o.status = 'preparing'
      AND o.shipment_location = ?
      ORDER BY o.shipment_no ASC
    `).all(location)

    // 제품명에서 (숫자 SETS) 제거
    const processedShipments = shipments.map(shipment => ({
      ...shipment,
      product_name: shipment.product_name.replace(/ \(\d+ SETS\)/g, '')
    }))

    // 엑셀 워크북 생성
    const wb = XLSX.utils.book_new()
    
    // 데이터 준비

    const headerData = [
      ['주문번호','출하번호', '상품코드', '상품명', '상품수', '무게', '운송장번호'] // 헤더 행
    ]
    
    // 데이터 행 추가
    const rowData = processedShipments.map(shipment => [
      shipment.reference_no,
      shipment.shipment_no,
      shipment.product_code,
      shipment.product_name,
      (shipment.quantity || 0) * (shipment.set_qty || 1),
      '',
      shipment.tracking_number || ''
    ])
    
    // 모든 데이터 합치기
    const allData = [...headerData, ...rowData]
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(allData)
    
    
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments')

    // 엑셀 파일 생성
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const today = new Date().toISOString().split('T')[0]
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=tracking_number_${location}_${today}.xlsx`
      }
    })
  } catch (error) {
    console.error('Error downloading shipment data:', error)
    return NextResponse.json(
      { error: '운송장 번호 입력 데이터 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 