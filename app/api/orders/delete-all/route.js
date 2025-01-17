import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function DELETE() {
  const db = getDB()

  try {
    db.prepare('DELETE FROM orders').run()
    
    return NextResponse.json({ 
      message: '모든 주문이 삭제되었습니다.' 
    })
  } catch (error) {
    console.error('주문 삭제 중 오류 발생:', error)
    return NextResponse.json(
      { error: '주문 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 