import { NextResponse } from 'next/server'
import { runMigrations } from '@/app/lib/migrations'

export async function POST() {
  try {
    const result = await runMigrations()
    if (result.success) {
      return NextResponse.json({ 
        message: '마이그레이션이 성공적으로 실행되었습니다.',
        success: true 
      })
    } else {
      return NextResponse.json(
        { error: result.error || '마이그레이션 실행 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error running migrations:', error)
    return NextResponse.json(
      { error: '마이그레이션 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 