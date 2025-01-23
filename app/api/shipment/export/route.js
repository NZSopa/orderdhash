import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'
import xlsx from 'xlsx'

// KSE 형식 변환
function formatKSE(shipments) {
  return shipments.map(shipment => ({
    '출하번호': shipment.shipment_no,
    '운송장번호': shipment.tracking_number,
    '수취인': shipment.consignee_name,
    '우편번호': shipment.postal_code,
    '주소': shipment.address,
    '상품코드': shipment.sku,
    '상품명': shipment.product_name,
    '수량': shipment.quantity,
    '중량': shipment.weight
  }))
}

// SSS 형식 변환
function formatSSS(shipments) {
  return shipments.map(shipment => ({
    'ShipmentNo': shipment.shipment_no,
    'TrackingNo': shipment.tracking_number,
    'ConsigneeName': shipment.consignee_name,
    'PostalCode': shipment.postal_code,
    'Address': shipment.address,
    'ProductCode': shipment.sku,
    'ProductName': shipment.product_name,
    'Quantity': shipment.quantity,
    'Weight': shipment.weight
  }))
}

// AUS/NZ 형식 변환
function formatLocation(shipments) {
  return shipments.map(shipment => ({
    '출하번호': shipment.shipment_no,
    '주문번호': shipment.order_id,
    '상품코드': shipment.sku,
    '상품명': shipment.product_name,
    '수량': shipment.quantity,
    '단가': shipment.unit_value,
    '수취인': shipment.consignee_name,
    '우편번호': shipment.postal_code,
    '주소': shipment.address,
    '운송장번호': shipment.tracking_number,
    '중량': shipment.weight,
    '출하일': new Date(shipment.updated_at).toLocaleDateString()
  }))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    if (!type) {
      return NextResponse.json(
        { error: '출력 형식이 필요합니다.' },
        { status: 400 }
      )
    }

    return await withDB(async (db) => {
      let query = `
        SELECT * 
        FROM shipment 
        WHERE status = 'shipped'
      `
      
      // AUS/NZ의 경우 location 필터 추가
      if (type === 'aus' || type === 'nz') {
        query += ` AND shipment_location = '${type}'`
      }
      
      query += ' ORDER BY updated_at DESC'
      
      const shipments = db.prepare(query).all()
      
      // 데이터 형식 변환
      let data
      switch (type) {
        case 'kse':
          data = formatKSE(shipments)
          break
        case 'sss':
          data = formatSSS(shipments)
          break
        case 'aus':
        case 'nz':
          data = formatLocation(shipments)
          break
        default:
          return NextResponse.json(
            { error: '잘못된 출력 형식입니다.' },
            { status: 400 }
          )
      }
      
      // 엑셀 파일 생성
      const worksheet = xlsx.utils.json_to_sheet(data)
      const workbook = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Shipments')
      
      // 파일 버퍼 생성
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      
      // 응답 헤더 설정
      const headers = new Headers()
      headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      headers.append('Content-Disposition', `attachment; filename=shipment_${type}_${new Date().toISOString().split('T')[0]}.xlsx`)
      
      return new Response(buffer, {
        headers,
        status: 200
      })
    })
  } catch (error) {
    console.error('Error exporting shipments:', error)
    return NextResponse.json(
      { error: error.message || '엑셀 파일 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 