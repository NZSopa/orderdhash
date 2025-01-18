import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET() {
  const db = getDB()
  try {
    // 테이블 존재 여부 확인
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'").get()
    
    if (!tableExists) {
      return NextResponse.json({ exists: false })
    }

    // 테이블 구조 확인
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inventory'").get()
    
    // 테이블의 실제 컬럼 정보 확인
    const columns = db.prepare("PRAGMA table_info(inventory)").all()

    return NextResponse.json({
      exists: true,
      schema,
      columns
    })
  } catch (error) {
    console.error('Error checking inventory table:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    db.close()
  }
} 