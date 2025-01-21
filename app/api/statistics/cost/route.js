import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const compareType = searchParams.get('compareType')
    let compareMonth = searchParams.get('compareMonth')

    console.log('Request params:', { month, compareType, compareMonth })

    if (!month) {
      return NextResponse.json(
        { error: '년월이 필요합니다.' },
        { status: 400 }
      )
    }

    const db = await getDB()

    // 전월 계산 함수
    function getPreviousMonth(yearMonth) {
      const [year, month] = yearMonth.split('-').map(num => parseInt(num))
      if (month === 1) {
        return `${year - 1}-12`
      }
      return `${year}-${String(month - 1).padStart(2, '0')}`
    }

    // 비교 월 결정
    if (compareType === 'prev') {
      compareMonth = getPreviousMonth(month)
    }

    // 현재 월 데이터 조회
    console.log('Current month:', month)

    const currentMonthQuery = `
      SELECT 
        p.product_code,
        CAST(p.price AS FLOAT) as price,
        pc.product_name,
        p.year_month
      FROM product_unit_prices p
      LEFT JOIN product_master pc ON p.product_code = pc.product_code
      WHERE p.year_month = ?
    `
    
    const currentMonthData = db.prepare(currentMonthQuery).all(month)
    console.log('Current month data:', {
      month: month,
      count: currentMonthData.length,
      sample: currentMonthData.slice(0, 3)
    })

    // 비교 월 데이터 조회
    if (!compareMonth) {
      return NextResponse.json(
        { error: '비교 년월이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    console.log('Compare month:', {
      original: compareMonth
    })

    const compareMonthQuery = `
      SELECT 
        p.product_code,
        CAST(p.price AS FLOAT) as price,
        pc.product_name,
        p.year_month
      FROM product_unit_prices p
      LEFT JOIN product_master pc ON p.product_code = pc.product_code
      WHERE p.year_month = ?
    `
    
    const compareMonthData = db.prepare(compareMonthQuery).all(compareMonth)
    console.log('Compare month data:', {
      month: compareMonth,
      count: compareMonthData.length,
      sample: compareMonthData.slice(0, 3)
    })

    // 가격 변동 분석
    const priceChanges = currentMonthData
      .filter(current => current.price > 0)
      .map(current => {
        const previous = compareMonthData.find(prev => prev.product_code === current.product_code)
        
        if (!previous || previous.price === 0) {
          console.log(`No previous data for: ${current.product_code} (${current.year_month} vs ${compareMonth})`)
          return null
        }

        const currentPrice = parseFloat(current.price)
        const previousPrice = parseFloat(previous.price)

        if (isNaN(currentPrice) || isNaN(previousPrice)) {
          console.log(`Invalid price data for: ${current.product_code}`, {
            currentPrice,
            previousPrice,
            current_month: current.year_month,
            previous_month: previous.year_month
          })
          return null
        }

        const priceChange = currentPrice - previousPrice
        const changePercent = (priceChange / previousPrice) * 100

        return {
          product_code: current.product_code,
          product_name: current.product_name || '제품명 없음',
          previous_price: previousPrice,
          current_price: currentPrice,
          price_change: priceChange,
          change_percent: changePercent,
          current_month: current.year_month,
          previous_month: previous.year_month
        }
      })
      .filter(item => item !== null)

    console.log('Price changes:', {
      total: priceChanges.length,
      sample: priceChanges.slice(0, 3)
    })

    // 통계 계산
    const increased = priceChanges.filter(item => item.price_change > 0)
    const decreased = priceChanges.filter(item => item.price_change < 0)
    
    const avgIncrease = increased.length > 0
      ? increased.reduce((sum, item) => sum + item.change_percent, 0) / increased.length
      : 0

    const avgDecrease = decreased.length > 0
      ? Math.abs(decreased.reduce((sum, item) => sum + item.change_percent, 0) / decreased.length)
      : 0

    const summary = {
      increased_count: increased.length,
      decreased_count: decreased.length,
      avg_increase: avgIncrease,
      avg_decrease: avgDecrease,
    }

    // 상위 변동 상품
    const topIncreased = [...increased]
      .sort((a, b) => b.change_percent - a.change_percent)
      .slice(0, 30)

    const topDecreased = [...decreased]
      .sort((a, b) => a.change_percent - b.change_percent)
      .slice(0, 30)

    console.log('Response summary:', {
      increased: topIncreased.length,
      decreased: topDecreased.length,
      summary
    })

    return NextResponse.json({
      success: true,
      data: {
        summary,
        top_increased: topIncreased,
        top_decreased: topDecreased,
        price_changes: priceChanges
      }
    })

  } catch (error) {
    console.error('Error in cost analysis:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
} 