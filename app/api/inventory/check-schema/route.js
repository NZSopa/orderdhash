import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET() {
  const db = getDB()
  try {
    const schema = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='inventory'
    `).get()
    
    return NextResponse.json({ schema })
  } catch (error) {
    console.error('Error checking schema:', error)
    return NextResponse.json(
      { error: '스키마 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 