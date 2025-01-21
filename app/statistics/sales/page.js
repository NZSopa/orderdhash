'use client'

import { useState } from 'react'
import { FaSearch, FaChartLine } from 'react-icons/fa'

export default function SalesPage() {
  const [viewType, setViewType] = useState('daily') // daily, monthly, custom
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">판매 현황</h1>
        
        {/* 필터 섹션 */}
        <div className="flex gap-4 mb-6">
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">일별</option>
            <option value="monthly">월별</option>
            <option value="custom">기간 지정</option>
          </select>
          
          {viewType === 'custom' && (
            <>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="flex items-center">~</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">총 주문 수</h3>
            <p className="text-2xl font-bold text-blue-600">0건</p>
          </div>
          <div className="bg-green-50 p-6 rounded-xl border border-green-100">
            <h3 className="text-lg font-semibold text-green-900 mb-2">총 판매 금액</h3>
            <p className="text-2xl font-bold text-green-600">₩0</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">평균 주문 금액</h3>
            <p className="text-2xl font-bold text-purple-600">₩0</p>
          </div>
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">최다 판매 상품</h3>
            <p className="text-2xl font-bold text-orange-600">-</p>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-96 flex items-center justify-center">
          <div className="text-gray-500 flex flex-col items-center">
            <FaChartLine className="w-12 h-12 mb-2" />
            <p>차트가 이곳에 표시됩니다</p>
          </div>
        </div>
      </div>
    </div>
  )
} 