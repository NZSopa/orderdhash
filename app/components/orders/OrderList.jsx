'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaChevronLeft, FaChevronRight, FaTrash, FaCalendarAlt } from 'react-icons/fa'

export default function OrderList() {
  const [orders, setOrders] = useState([])
  const [summaryData, setSummaryData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filteredOrders, setFilteredOrders] = useState(null)
  const [filterType, setFilterType] = useState(null)
  const [pageSize, setPageSize] = useState(20)
  const [isTableCompact, setIsTableCompact] = useState(false)

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/orders?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}&date=${selectedDate}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '주문 목록을 불러오는 중 오류가 발생했습니다.')
      }

      setOrders(data.data)
      setTotalPages(Math.ceil(data.total / pageSize))
      setTotal(data.total)

      const summaryResponse = await fetch(
        `/api/orders/summary?date=${selectedDate}`
      )
      const summaryData = await summaryResponse.json()
      
      if (!summaryResponse.ok) {
        throw new Error(summaryData.error || '주문 요약을 불러오는 중 오류가 발생했습니다.')
      }

      setSummaryData(summaryData.data)

    } catch (error) {
      console.error('Error loading orders:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }, [])

  useEffect(() => {
    loadOrders()
  }, [page, pageSize, searchQuery, selectedDate])

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value)
    setPage(1)
  }

  const handleTodayClick = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setPage(1)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('모든 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/orders/delete-all', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '주문 삭제 중 오류가 발생했습니다.')
      }

      // 주문 목록 새로고침
      setPage(1)
      await loadOrders()
    } catch (error) {
      console.error('Error deleting orders:', error)
      setError(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const getHighValueOrders = () => {
    return orders.filter(order => order.quantity * order.unit_value > 16600)
  }

  const getDuplicateReferenceNos = () => {
    const referenceNos = []
    const duplicates = []
    orders.forEach(order => {
      if (referenceNos.includes(order.reference_no)) {
        if (!duplicates.includes(order.reference_no)) {
          duplicates.push(order.reference_no)
        }
      } else {
        referenceNos.push(order.reference_no)
      }
    })
    return duplicates
  }

  const getDuplicateConsignees = () => {
    const consigneeCount = {}
    orders.forEach(order => {
      consigneeCount[order.consignee_name] = (consigneeCount[order.consignee_name] || 0) + 1
    })
    return Object.entries(consigneeCount)
      .filter(([_, count]) => count > 1)
      .map(([name, count]) => ({ name, count }))
  }

  const handleFilterClick = async (type, filterValue) => {
    setFilterType(type)
    setLoading(true)
    
    try {
      let filtered = null;

      // 필터링된 데이터를 서버에서 가져오기
      const response = await fetch(
        `/api/orders/all?date=${selectedDate}`
      )
      const allOrders = await response.json()
      
      if (!response.ok) {
        throw new Error(allOrders.error || '데이터를 불러오는 중 오류가 발생했습니다.')
      }

      switch (type) {
        case 'highValue':
          filtered = allOrders.data.filter(order => order.quantity * order.unit_value > 16600)
          break
        case 'duplicateRef':
          filtered = allOrders.data.filter(order => 
            summaryData.duplicateRefs.refs.includes(order.reference_no)
          )
          break
        case 'duplicateConsignee':
          const consigneeNames = summaryData.duplicateConsignees.consignees.map(c => c.name)
          filtered = allOrders.data.filter(order => 
            consigneeNames.includes(order.consignee_name)
          )
          break
        case 'singleRef':
          filtered = allOrders.data.filter(order => order.reference_no === filterValue)
          break
        case 'singleConsignee':
          filtered = allOrders.data.filter(order => order.consignee_name === filterValue)
          break
        default:
          filtered = null
      }

      setFilteredOrders(filtered)
    } catch (error) {
      console.error('Error filtering orders:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const clearFilter = () => {
    setFilterType(null)
    setFilteredOrders(null)
  }

  const displayOrders = filteredOrders || orders;

  const renderSummary = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg rounded-xl mb-6 border border-blue-100">
      <div className="px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold leading-6 text-gray-900">주문 요약</h3>
          {filterType && (
            <button
              onClick={clearFilter}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              필터 해제
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
            <div className="text-sm font-medium text-gray-500">등록 날짜</div>
            <div className="mt-2 text-base font-semibold text-gray-900">{selectedDate}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
            <div className="text-sm font-medium text-gray-500">전체 주문</div>
            <div className="mt-2 text-base font-semibold text-gray-900">{summaryData?.total || 0}건</div>
          </div>
          {summaryData?.highValue.count > 0 && (
            <div className="sm:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-red-100">
              <button
                onClick={() => handleFilterClick('highValue')}
                className={`text-base text-red-600 font-semibold hover:text-red-800 ${filterType === 'highValue' ? 'underline decoration-2' : ''}`}
              >
                관세발생예상 ({summaryData.highValue.count}건)
              </button>
              <div className="mt-2 text-sm text-gray-600">
                주문번호:{' '}
                {summaryData.highValue.orders.map((order, idx) => (
                  <button
                    key={order.reference_no}
                    onClick={() => handleFilterClick('singleRef', order.reference_no)}
                    className={`hover:text-red-800 transition-colors ${filterType === 'singleRef' && filteredOrders?.[0]?.reference_no === order.reference_no ? 'font-semibold text-red-700' : 'text-red-600'}`}
                  >
                    {order.reference_no}
                    {idx < summaryData.highValue.orders.length - 1 ? ', ' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          {summaryData?.duplicateRefs.count > 0 && (
            <div className="sm:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-orange-100">
              <button
                onClick={() => handleFilterClick('duplicateRef')}
                className={`text-base text-orange-600 font-semibold hover:text-orange-800 ${filterType === 'duplicateRef' ? 'underline decoration-2' : ''}`}
              >
                중복 주문번호 ({summaryData.duplicateRefs.count}건)
              </button>
              <div className="mt-2 text-sm text-gray-600">
                주문번호:{' '}
                {summaryData.duplicateRefs.refs.map((refNo, idx) => (
                  <button
                    key={refNo}
                    onClick={() => handleFilterClick('singleRef', refNo)}
                    className={`hover:text-orange-800 transition-colors ${filterType === 'singleRef' && filteredOrders?.[0]?.reference_no === refNo ? 'font-semibold text-orange-700' : 'text-orange-600'}`}
                  >
                    {refNo}
                    {idx < summaryData.duplicateRefs.refs.length - 1 ? ', ' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          {summaryData?.duplicateConsignees.count > 0 && (
            <div className="sm:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
              <button
                onClick={() => handleFilterClick('duplicateConsignee')}
                className={`text-base text-indigo-600 font-semibold hover:text-indigo-800 ${filterType === 'duplicateConsignee' ? 'underline decoration-2' : ''}`}
              >
                수취인 중복 ({summaryData.duplicateConsignees.count}명)
              </button>
              <div className="mt-2 text-sm text-gray-600">
                {summaryData.duplicateConsignees.consignees.map((consignee, idx) => (
                  <button
                    key={consignee.name}
                    onClick={() => handleFilterClick('singleConsignee', consignee.name)}
                    className={`hover:text-indigo-800 transition-colors ${filterType === 'singleConsignee' && filteredOrders?.[0]?.consignee_name === consignee.name ? 'font-semibold text-indigo-700' : 'text-indigo-600'}`}
                  >
                    {consignee.name} ({consignee.count}건)
                    {idx < summaryData.duplicateConsignees.consignees.length - 1 ? ', ' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* 검색 및 필터 컨트롤 */}
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="주문번호 또는 수취인으로 검색..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleTodayClick}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
            >
              <FaCalendarAlt /> 오늘
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={15}>15개씩</option>
            <option value={30}>30개씩</option>
            <option value={50}>50개씩</option>
          </select>
          <button
            onClick={handleDeleteAll}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <FaTrash /> 전체 삭제
          </button>
        </div>
      </div>

      {/* 요약 정보 */}
      {summaryData && renderSummary()}

      {/* 주문 목록 테이블 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">주문번호</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">수취인</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">연락처</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">주소</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">상품코드</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">수량</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">단가</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">금액</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayOrders.map((order, index) => (
                  <tr key={`${order.reference_no}-${index}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-600">{order.reference_no}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{order.consignee_name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{order.phone_number}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 max-w-md truncate">{order.address}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{order.product_code}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{order.quantity}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{order.unit_value.toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{(order.quantity * order.unit_value).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="px-3 py-3 border-t border-gray-200 bg-gray-50 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  총 <span className="font-medium">{total}</span>건 중{' '}
                  <span className="font-medium">{(page - 1) * pageSize + 1}</span>-
                  <span className="font-medium">{Math.min(page * pageSize, total)}</span>건
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-white text-gray-500 rounded-md border hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm bg-white text-gray-500 rounded-md border hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 