'use client'

import { useState } from 'react'
import { FaSearch, FaBoxOpen } from 'react-icons/fa'

export default function InventoryStatsPage() {
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [stockFilter, setStockFilter] = useState('all') // all, low, out

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">재고 현황</h1>
        
        {/* 필터 섹션 */}
        <div className="flex gap-4 mb-6">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 브랜드</option>
            <option value="brand1">브랜드 1</option>
            <option value="brand2">브랜드 2</option>
          </select>
          
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 재고</option>
            <option value="low">부족 재고</option>
            <option value="out">품절</option>
          </select>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">총 재고 수량</h3>
            <p className="text-2xl font-bold text-blue-600">0개</p>
          </div>
          <div className="bg-green-50 p-6 rounded-xl border border-green-100">
            <h3 className="text-lg font-semibold text-green-900 mb-2">재고 금액</h3>
            <p className="text-2xl font-bold text-green-600">₩0</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">부족 재고</h3>
            <p className="text-2xl font-bold text-purple-600">0개</p>
          </div>
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">품절</h3>
            <p className="text-2xl font-bold text-orange-600">0개</p>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-96 flex items-center justify-center">
          <div className="text-gray-500 flex flex-col items-center">
            <FaBoxOpen className="w-12 h-12 mb-2" />
            <p>차트가 이곳에 표시됩니다</p>
          </div>
        </div>
      </div>
    </div>
  )
} 