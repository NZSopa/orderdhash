import { NextResponse } from 'next/server'
import db from '@/app/lib/db'

// GET /api/inventory?query=검색어
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    const items = await db.inventory.toArray() || []
    const data = items.map(item => ({
      ...item,
      status: item.stock < item.min_stock ? 'low' : 'normal'
    }))
    
    if (query) {
      return NextResponse.json({
        data: data.filter(item =>
          item.code?.toLowerCase().includes(query.toLowerCase()) ||
          item.name?.toLowerCase().includes(query.toLowerCase())
        )
      })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ data: [] })
  }
}

// POST /api/inventory
export async function POST(request) {
  try {
    const item = await request.json()
    const id = await db.inventory.put({
      ...item,
      updated_at: new Date(),
      created_at: item.id ? undefined : new Date()
    })
    
    return NextResponse.json({ message: '저장되었습니다.' })
  } catch (error) {
    console.error('Error saving inventory item:', error)
    return NextResponse.json(
      { error: '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory?code=품목코드
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json(
        { error: '품목 코드가 필요합니다.' },
        { status: 400 }
      )
    }

    await db.inventory.where('code').equals(code).delete()
    return NextResponse.json({ message: '삭제되었습니다.' })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 