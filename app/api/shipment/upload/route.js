import { NextResponse } from 'next/server'
import { getDB, withDB } from '@/app/lib/db'
import * as XLSX from 'xlsx'

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file')
      
      if (!file) {
        return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
      }

      // 파일 내용을 버퍼로 읽기
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      
      // 출하날짜 읽기 (전체 데이터를 읽어서 첫 번째 행의 두 번째 셀 값을 가져옴)
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      const shipmentDate = rawData[0]?.[1]
      
      console.log('Read shipment date:', shipmentDate) // 디버깅용 로그

      if (!shipmentDate) {
        return NextResponse.json({ error: '출하날짜가 입력되지 않았습니다.' }, { status: 400 })
      }

      // 날짜 형식이 YYYY-MM-DD가 아닌 경우 변환 시도
      let formattedDate = shipmentDate
      if (typeof shipmentDate === 'number') {
        // Excel의 날짜 형식인 경우 변환
        formattedDate = new Date((shipmentDate - 25569) * 86400 * 1000)
          .toISOString()
          .split('T')[0]
      } else if (typeof shipmentDate === 'string') {
        // 이미 문자열인 경우 형식만 검증
        if (!/^\d{4}-\d{2}-\d{2}$/.test(shipmentDate)) {
          return NextResponse.json({ error: '올바른 출하날짜를 입력해주세요. (YYYY-MM-DD 형식)' }, { status: 400 })
        }
      }

      console.log('Formatted date:', formattedDate) // 디버깅용 로그

      // 데이터를 JSON으로 변환 (3번째 행부터)
      const data = XLSX.utils.sheet_to_json(worksheet, { range: 2 })

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        const stmt = db.prepare(`
          UPDATE orders 
          SET 
            weight = ?,
            memo = ?,
            shipment_at = ?,
            status = 'dispatched',
            shipment_at = datetime('now')
          WHERE shipment_no = ?
        `)

        let updatedCount = 0
        
        for (const row of data) {
          if (!row['출하번호']) continue

          stmt.run([
            row['무게'] || null,
            row['메모'] || null,
            formattedDate,
            row['출하번호']
          ])
          updatedCount++
        }

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ 
          success: true,
          message: `${updatedCount}건의 출하 데이터가 업데이트되었습니다.`
        })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error uploading shipment data:', error)
      return NextResponse.json(
        { error: '출하 데이터 업로드 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 