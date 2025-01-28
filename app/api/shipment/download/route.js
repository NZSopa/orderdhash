import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'
import * as XLSX from 'xlsx'

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
        s.shipment_no,
        s.product_code,
        s.product_name,
        s.quantity,
        s.set_qty,
        s.memo
      FROM shipment s
      WHERE s.shipment_no IS NOT NULL
      AND s.status = 'processing'
      AND s.shipment_location = ?
      ORDER BY s.shipment_no ASC
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
      ['출하날짜', ''], // 첫 번째 행: 출하날짜 입력란
      [], // 빈 행
      ['출하번호', '상품코드', '상품명', '상품수', '무게', '메모'] // 헤더 행
    ]
    
    // 데이터 행 추가
    const rowData = processedShipments.map(shipment => [
      shipment.shipment_no,
      shipment.product_code,
      shipment.product_name,
      (shipment.quantity || 0) * (shipment.set_qty || 1),
      '',
      shipment.memo || ''
    ])
    
    // 모든 데이터 합치기
    const allData = [...headerData, ...rowData]
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(allData)
    
    // 첫 번째 셀(출하날짜) 스타일 지정
    ws['A1'] = { t: 's', v: '출하날짜' }
    ws['B1'] = { t: 's', v: 'YYYY-MM-DD 형식으로 입력해주세요' }
    
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments')

    // 엑셀 파일 생성
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const today = new Date().toISOString().split('T')[0]
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=shipments_${location}_${today}.xlsx`
      }
    })
  } catch (error) {
    console.error('Error downloading shipment data:', error)
    return NextResponse.json(
      { error: '출하 데이터 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 