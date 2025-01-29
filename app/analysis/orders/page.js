'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'
import MonthPicker from '@/app/components/MonthPicker'

export default function OrderAnalysisPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc')
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit')) || 20
  const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
  const settlementMonth = searchParams.get('settlementMonth') || ''

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/analysis/orders?page=${page}&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${endDate}&settlementMonth=${settlementMonth}`
      )
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setOrders(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('주문 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search, limit, startDate, endDate, settlementMonth])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // 페이지당 표시 수 변경
  const handleLimitChange = (newLimit) => {
    router.push(`/analysis/orders?page=1&limit=${newLimit}&search=${search}&startDate=${startDate}&endDate=${endDate}&settlementMonth=${settlementMonth}`)
  }

  // 날짜 범위 변경 처리
  const handleDateChange = (type, newDate) => {
    if (type === 'start') {
      router.push(`/analysis/orders?page=1&limit=${limit}&search=${search}&startDate=${newDate}&endDate=${endDate}&settlementMonth=${settlementMonth}`)
    } else {
      router.push(`/analysis/orders?page=1&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${newDate}&settlementMonth=${settlementMonth}`)
    }
  }

  // 정산월 변경 처리
  const handleSettlementMonthChange = (newMonth) => {
    router.push(`/analysis/orders?page=1&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${endDate}&settlementMonth=${newMonth}`)
  }

  // 오늘 날짜 주문 조회
  const handleTodayOrders = () => {
    const today = new Date().toISOString().split('T')[0]
    router.push(`/analysis/orders?page=1&limit=${limit}&search=${search}&startDate=${today}&endDate=${today}&settlementMonth=${settlementMonth}`)
  }

  // 파일 다운로드
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/analysis/orders/download?startDate=${startDate}&endDate=${endDate}&settlementMonth=${settlementMonth}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `order_summary_${startDate}_${endDate}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('주문 데이터가 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading data:', error)
      toast.error(error.message)
    }
  }

  // 파일 업로드
  const handleUpload = async (event) => {
    try {
      const file = event.target.files[0]
      if (!file) return
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/analysis/orders/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '업로드 중 오류가 발생했습니다.')
      }
      
      toast.success(result.message)
      fetchOrders()
    } catch (error) {
      console.error('Error uploading data:', error)
      toast.error(error.message)
    }
    
    event.target.value = ''
  }

  // 정렬 처리
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // 정렬된 데이터 반환
  const getSortedOrders = () => {
    if (!sortField) return orders

    return [...orders].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (aValue === null) aValue = ''
      if (bValue === null) bValue = ''

      if (['quantity', 'total_amount', 'total_orders'].includes(sortField)) {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span className="text-gray-400 ml-1">↕</span>
    }
    return sortOrder === 'asc' ? 
      <span className="text-blue-600 ml-1">↑</span> : 
      <span className="text-blue-600 ml-1">↓</span>
  }

  return (
    <div className="container max-w-none px-4 h-screen flex flex-col">
      {/* 검색 영역 */}
      <div className="flex-none space-y-4 py-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          {/* 왼쪽 영역 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold whitespace-nowrap">주문 분석</h1>
            <div className="w-full sm:w-auto">
              <SearchBox 
                defaultValue={search} 
                onSearch={(value) => router.push(`/analysis/orders?page=1&limit=${limit}&search=${value}&startDate=${startDate}&endDate=${endDate}&settlementMonth=${settlementMonth}`)} 
              />
            </div>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10개씩 보기</option>
              <option value="20">20개씩 보기</option>
              <option value="50">50개씩 보기</option>
              <option value="100">100개씩 보기</option>
            </select>
          </div>

          {/* 오른쪽 영역 */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={handleDownload}
              className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              데이터 다운로드
            </button>
            <label className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer text-center">
              데이터 업로드
              <input
                type="file"
                accept=".csv"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 필터 영역 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={handleTodayOrders}
            className="w-full sm:w-auto px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            TODAY
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              min="2022-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="w-full sm:w-auto px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="hidden sm:inline">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              className="w-full sm:w-auto px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <MonthPicker
            value={settlementMonth}
            onChange={handleSettlementMonthChange}
            minYear={2022}
          />
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sales_site')}
                >
                  플랫폼 {renderSortIcon('sales_site')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('order_date')}
                >
                  주문일 {renderSortIcon('order_date')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('order_number')}
                >
                  주문번호 {renderSortIcon('order_number')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('product_code')}
                >
                  상품코드 {renderSortIcon('product_code')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[200px]"
                  onClick={() => handleSort('product_name')}
                >
                  제품명 {renderSortIcon('product_name')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_orders')}
                >
                  주문수 {renderSortIcon('total_orders')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sales_price')}
                >
                  판매가 {renderSortIcon('sales_price')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('purchase_cost')}
                >
                  매입가 {renderSortIcon('purchase_cost')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('profit')}
                >
                  이익 {renderSortIcon('profit')}
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('settlement_month')}
                >
                  정산월 {renderSortIcon('settlement_month')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedOrders().map((order, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.sales_site}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.order_date}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.order_number}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.product_code}</td>
                  <td className="px-3 py-2 whitespace-normal text-sm">{order.product_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.quantity}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.sales_price}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.purchase_cost}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.profit}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{order.settlement_month}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              주문 내역이 없습니다.
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="flex-none mt-4">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={(page) => router.push(`/analysis/orders?page=${page}&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${endDate}&settlementMonth=${settlementMonth}`)}
          />
        </div>
      </div>
    </div>
  )
} 