import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function GET() {
  try {
    return await withDB(async (db) => {
      const rows = db.prepare('SELECT * FROM sales_listings').all()
      return NextResponse.json(rows)
    })
  } catch (error) {
    console.error('DB download error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
} 