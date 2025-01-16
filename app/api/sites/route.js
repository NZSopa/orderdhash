import { NextResponse } from 'next/server'
import sqlite3 from 'better-sqlite3'
import path from 'path'

function getDB() {
  return sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'))
}

// GET /api/sites
export async function GET() {
  const db = getDB()
  try {
    const sites = db.prepare('SELECT * FROM sales_sites ORDER BY code').all()
    return NextResponse.json({ data: sites })
  } catch (error) {
    console.error('Error getting sales sites:', error)
    return NextResponse.json(
      { error: '판매 사이트 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

// POST /api/sites
export async function POST(request) {
  try {
    const site = await request.json()
    const db = getDB()
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO sales_sites (
          code, name, updated_at, created_at
        ) VALUES (
          @code, @name,
          CURRENT_TIMESTAMP,
          COALESCE((SELECT created_at FROM sales_sites WHERE code = @code), CURRENT_TIMESTAMP)
        )
      `)
      stmt.run(site)
      return NextResponse.json({ 
        message: '판매 사이트가 저장되었습니다.',
        success: true 
      })
    } finally {
      db.close()
    }
  } catch (error) {
    console.error('Error saving sales site:', error)
    return NextResponse.json(
      { error: '판매 사이트 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/sites
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json(
        { error: '삭제할 사이트 코드가 필요합니다.' },
        { status: 400 }
      )
    }

    const db = getDB()
    try {
      db.prepare('DELETE FROM sales_sites WHERE code = ?').run(code)
      return NextResponse.json({ 
        message: '판매 사이트가 삭제되었습니다.',
        success: true 
      })
    } finally {
      db.close()
    }
  } catch (error) {
    console.error('Error deleting sales site:', error)
    return NextResponse.json(
      { error: '판매 사이트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 