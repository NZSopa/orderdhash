'use client'

import { useState } from 'react'
import { FaSearch, FaChartBar } from 'react-icons/fa'

export default function ProfitPage() {
  const [selectedSite, setSelectedSite] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">이익 계산</h1>
        
        {/* 필터 섹션 */}
        <div className="flex gap-4 mb-6">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 사이트</option>
            <option value="site1">사이트 1</option>
            <option value="site2">사이트 2</option>
          </select>
          
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
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">총 매출</h3>
            <p className="text-2xl font-bold text-blue-600">₩0</p>
          </div>
          <div className="bg-green-50 p-6 rounded-xl border border-green-100">
            <h3 className="text-lg font-semibold text-green-900 mb-2">총 비용</h3>
            <p className="text-2xl font-bold text-green-600">₩0</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">순이익</h3>
            <p className="text-2xl font-bold text-purple-600">₩0</p>
          </div>
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">이익률</h3>
            <p className="text-2xl font-bold text-orange-600">0%</p>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-96 flex items-center justify-center">
          <div className="text-gray-500 flex flex-col items-center">
            <FaChartBar className="w-12 h-12 mb-2" />
            <p>차트가 이곳에 표시됩니다</p>
          </div>
        </div>
      </div>
    </div>
  )
} 