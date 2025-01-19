import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

// 환율 정보를 외부 API에서 가져오는 함수
async function fetchExchangeRates() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/NZD')
    const data = await response.json()
    return {
      usd_nzd: 1 / data.rates.USD,
      jpy_nzd: 1 / data.rates.JPY,
      timestamp: new Date(data.time_last_updated * 1000)
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    throw error
  }
}

export async function GET() {
  try {
    const db = getDB()
    
    // 최신 환율 정보 조회
    const rates = db.prepare('SELECT currency_pair, rate, updated_at FROM Exchange_Rates').all()
    
    // 환율 정보가 없거나 마지막 업데이트로부터 1시간이 지났다면 새로 가져옴
    const lastUpdate = rates.length > 0 ? new Date(rates[0].updated_at) : new Date(0)
    const needsUpdate = Date.now() - lastUpdate.getTime() > 3600000 // 1시간

    if (needsUpdate) {
      const newRates = await fetchExchangeRates()
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO Exchange_Rates (currency_pair, rate, updated_at)
        VALUES (@pair, @rate, CURRENT_TIMESTAMP)
      `)

      const insertMany = db.transaction((items) => {
        for (const [pair, rate] of Object.entries(items)) {
          if (pair !== 'timestamp') {
            stmt.run({ pair, rate })
          }
        }
      })

      insertMany(newRates)
      
      // 업데이트된 환율 정보 반환
      return NextResponse.json({
        success: true,
        data: newRates
      })
    }

    // 기존 환율 정보를 객체로 변환하여 반환
    const ratesObject = rates.reduce((acc, { currency_pair, rate, updated_at }) => {
      acc[currency_pair] = rate
      acc.timestamp = updated_at
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: ratesObject
    })
  } catch (error) {
    console.error('Error handling exchange rates:', error)
    return NextResponse.json(
      { success: false, error: '환율 정보 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 