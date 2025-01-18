'use client'

import { useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'

export default function InventoryList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [inventoryItems, setInventoryItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInventoryItems()
  }, [])

  const loadInventoryItems = async () => {
    try {
      const url = searchQuery 
        ? `/api/inventory/search?query=${encodeURIComponent(searchQuery)}`
        : '/api/inventory/all'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items')
      }
      const data = await response.json()
      setInventoryItems(data)
    } catch (error) {
      console.error('Error loading inventory items:', error)
      setInventoryItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    // 디바운스 처리
    const timeoutId = setTimeout(() => {
      loadInventoryItems()
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  if (loading) {
    return <div className="text-center py-4">로딩 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="상품코드 또는 상품명으로 검색..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품코드</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NZ 재고</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AUS 재고</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">메모</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventoryItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  등록된 재고 정보가 없습니다.
                </td>
              </tr>
            ) : (
              inventoryItems.map((item) => (
                <tr key={item.product_code}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nz_stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.aus_stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.memo || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 