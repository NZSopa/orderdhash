import { NextResponse } from 'next/server'
import { getDB, withDB } from '@/app/lib/db'

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file')
      
      if (!file) {
        return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
      }

      // 파일 내용을 텍스트로 읽기
      const text = await file.text()
      const lines = text.split('\n')
      
      // 헤더 제거
      lines.shift()
      
      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        const stmt = db.prepare(`
          UPDATE orders 
          SET kana = ?, 
              updated_at = datetime('now')
          WHERE reference_no = ?
        `)

        let updatedCount = 0
        
        // CSV 파일의 각 라인을 처리
        for (const line of lines) {
          if (!line.trim()) continue
          
          // 첫 번째 콤마와 마지막 콤마의 위치를 찾아서 필드를 추출
          const firstComma = line.indexOf(',')
          const lastComma = line.lastIndexOf(',')
          
          if (firstComma === -1 || lastComma === -1) continue
          
          const reference_no = line.substring(0, firstComma).replace(/"/g, '').trim()
          const kana = line.substring(lastComma + 1).replace(/"/g, '').trim()
          
          if (reference_no && kana) {
            console.log('Updating:', { reference_no, kana }) // 디버깅용 로그
            stmt.run([kana, reference_no])
            updatedCount++
          }
        }

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({ 
          success: true,
          message: `${updatedCount}건의 kana 데이터가 업데이트되었습니다.`
        })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error uploading kana data:', error)
      return NextResponse.json(
        { error: 'kana 데이터 업로드 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 