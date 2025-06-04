import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'
import xlsx from 'xlsx'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    // 파일 읽기
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = xlsx.read(buffer)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = xlsx.utils.sheet_to_json(worksheet)

    return await withDB(async (db) => {
      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()
      
      try {
        const results = []
        
        for (const row of data) {
          const shipmentNo = row['출하번호'] || row['shipment_no']
          if (!shipmentNo) {
            throw new Error('출하번호가 없는 데이터가 있습니다.')
          }

          // 출하 정보 업데이트
          const updateStmt = db.prepare(`
            UPDATE orders 
            SET 
              status = 'dispatched',
              tracking_number = ?,
              weight = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE shipment_no = ?
          `)

          const result = updateStmt.run(
            row['운송장번호'] || row['tracking_number'] || null,
            row['중량'] || row['weight'] || null,
            shipmentNo
          )

          if (result.changes === 0) {
            results.push({
              shipmentNo,
              error: '해당 출하번호를 찾을 수 없습니다.'
            })
          } else {
            results.push({
              shipmentNo,
              success: true
            })
          }
        }
        
        // 트랜잭션 커밋
        db.prepare('COMMIT').run()
        
        // 결과 반환
        const failedCount = results.filter(r => r.error).length
        if (failedCount > 0) {
          return NextResponse.json({
            warning: `${failedCount}건의 처리 실패가 있습니다.`,
            results
          })
        }
        
        return NextResponse.json({
          success: true,
          message: `${results.length}건의 출하가 완료되었습니다.`,
          results
        })
      } catch (error) {
        // 트랜잭션 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    })
  } catch (error) {
    console.error('Error processing shipment completion:', error)
    return NextResponse.json(
      { error: error.message || '출하 완료 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 