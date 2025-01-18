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
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gradient-to-r from-white to-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="bg-blue-100 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
            주문 목록
          </h2>
          <p className="mt-1 ml-11 text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-full inline-block">
            처리된 모든 주문을 확인하고 검색할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="block w-44 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <button
              onClick={handleTodayClick}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Today
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="주문번호, 상품코드, 수취인 등으로 검색"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button
            onClick={handleDeleteAll}
            disabled={isDeleting || loading || total === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaTrash className="mr-2 h-4 w-4" />
            {isDeleting ? '삭제 중...' : '전체 삭제'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {renderSummary()}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm text-gray-700">
                  전체{' '}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    {total}
                  </span>
                  {' '}건 중{' '}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {(page - 1) * pageSize + 1}
                  </span>
                  {' '}-{' '}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {Math.min(page * pageSize, total)}
                  </span>
                  {' '}건
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <span className="text-sm font-medium text-gray-600">페이지당 데이터 갯수</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                    className="block w-32 pl-3 pr-10 py-1.5 text-sm bg-indigo-50 border-indigo-200 text-indigo-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md transition-colors hover:bg-indigo-100"
                  >
                    <option value={15}>15개</option>
                    <option value={30}>30개</option>
                    <option value={50}>50개</option>
                    <option value={9999}>전체</option>
                  </select>
                </div>
                <button
                  onClick={() => setIsTableCompact(!isTableCompact)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isTableCompact 
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {isTableCompact ? '기본 크기로 보기' : '60% 크기로 보기'}
                </button>
              </div>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">이전</span>
                  <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">다음</span>
                  <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th scope="col" className={`py-1 pl-2 pr-1 text-left font-semibold text-gray-900 sm:pl-3 ${isTableCompact ? 'text-[7px] w-[36px]' : 'text-[11px] w-[60px]'}`}>판매사이트</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[48px]' : 'text-[11px] w-[80px]'}`}>주문번호</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[42px]' : 'text-[11px] w-[70px]'}`}>상품코드</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[60px]' : 'text-[11px] w-[100px]'}`}>상품명</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[18px]' : 'text-[11px] w-[30px]'}`}>수량</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[42px]' : 'text-[11px] w-[70px]'}`}>전체 판매가</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[42px]' : 'text-[11px] w-[70px]'}`}>수취인</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[36px]' : 'text-[11px] w-[60px]'}`}>우편번호</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[48px]' : 'text-[11px] w-[80px]'}`}>주소</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[48px]' : 'text-[11px] w-[80px]'}`}>연락처</th>
                      <th scope="col" className={`px-1 py-1 text-left font-semibold text-gray-900 ${isTableCompact ? 'text-[7px] w-[36px]' : 'text-[11px] w-[60px]'}`}>판매단가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {displayOrders.map((order, index) => {
                      const totalValue = order.quantity * order.unit_value;
                      const isHighValue = totalValue > 16600;
                      
                      return (
                        <tr key={`${order.reference_no}-${index}`} className="hover:bg-blue-50 transition-colors">
                          <td className={`whitespace-nowrap py-0.5 pl-2 pr-1 font-medium text-gray-900 sm:pl-3 ${isTableCompact ? 'text-[7px] w-[36px]' : 'text-[11px] w-[60px]'}`}>
                            <span className={`inline-flex items-center px-1 py-0.5 rounded font-medium
                              ${isTableCompact ? 'text-[6px]' : 'text-[10px]'}
                              ${order.sales_site === 'amazon' ? 'bg-orange-100 text-orange-800' : 
                                order.sales_site === 'yahoo' ? 'bg-blue-100 text-blue-800' :
                                order.sales_site === 'rakuten' ? 'bg-red-100 text-red-800' :
                                order.sales_site === 'NZP' ? 'bg-purple-100 text-purple-800' :
                                order.sales_site === 'NZSALE' ? 'bg-green-100 text-green-800' :
                                order.sales_site === 'CATCH' ? 'bg-yellow-100 text-yellow-800' :
                                order.sales_site === 'TRADEME' ? 'bg-pink-100 text-pink-800' :
                                'bg-gray-100 text-gray-800'}`}>
                              {order.sales_site}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap px-1 py-0.5 font-medium text-gray-900 ${isTableCompact ? 'text-[7px] w-[48px]' : 'text-[11px] w-[80px]'}`}>{order.reference_no}</td>
                          <td className={`whitespace-nowrap px-1 py-0.5 text-gray-600 ${isTableCompact ? 'text-[7px] w-[42px]' : 'text-[11px] w-[70px]'}`}>{order.sku}</td>
                          <td className={`px-1 py-0.5 text-gray-900 ${isTableCompact ? 'text-[7px] w-[60px]' : 'text-[11px] w-[100px]'}`}>
                            <div className={`font-medium leading-3 truncate ${isTableCompact ? 'text-[7px]' : 'text-[11px]'}`} title={order.product_name}>{order.product_name}</div>
                            {order.original_product_name && order.original_product_name !== order.product_name && (
                              <div className={`text-gray-500 mt-0.5 leading-3 truncate ${isTableCompact ? 'text-[6px]' : 'text-[9px]'}`} title={order.original_product_name}>{order.original_product_name}</div>
                            )}
                          </td>
                          <td className={`whitespace-nowrap px-1 py-0.5 font-medium text-gray-900 ${isTableCompact ? 'text-[7px] w-[18px]' : 'text-[11px] w-[30px]'}`}>{order.quantity}</td>
                          <td className={`whitespace-nowrap px-1 py-0.5 font-semibold ${isTableCompact ? 'text-[7px] w-[42px]' : 'text-[11px] w-[70px]'} ${isHighValue ? 'text-red-600' : 'text-gray-900'}`}>
                            {totalValue.toLocaleString()}
                          </td>
                          <td className={`whitespace-nowrap px-1 py-0.5 ${isTableCompact ? 'text-[7px] w-[42px]' : 'text-[11px] w-[70px]'}`}>
                            <div className={`font-medium text-gray-900 leading-3 truncate ${isTableCompact ? 'text-[7px]' : 'text-[11px]'}`} title={order.consignee_name}>{order.consignee_name}</div>
                            <div className={`text-gray-500 mt-0.5 leading-3 truncate ${isTableCompact ? 'text-[6px]' : 'text-[9px]'}`} title={order.kana}>{order.kana}</div>
                          </td>
                          <td className={`whitespace-nowrap px-1 py-0.5 text-gray-600 ${isTableCompact ? 'text-[7px] w-[36px]' : 'text-[11px] w-[60px]'}`}>{order.post_code}</td>
                          <td className={`whitespace-nowrap px-1 py-0.5 text-gray-600 truncate ${isTableCompact ? 'text-[7px] w-[48px]' : 'text-[11px] w-[80px]'}`} title={order.address}>{order.address}</td>
                          <td className={`whitespace-nowrap px-1 py-0.5 text-gray-600 ${isTableCompact ? 'text-[7px] w-[48px]' : 'text-[11px] w-[80px]'}`}>{order.phone_number}</td>
                          <td className={`whitespace-nowrap px-1 py-0.5 font-medium text-gray-900 ${isTableCompact ? 'text-[7px] w-[36px]' : 'text-[11px] w-[60px]'}`}>{order.unit_value?.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  전체 <span className="font-medium">{total}</span> 건 중{' '}
                  <span className="font-medium">{(page - 1) * pageSize + 1}</span> -{' '}
                  <span className="font-medium">{Math.min(page * pageSize, total)}</span> 건
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">이전</span>
                    <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">다음</span>
                    <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 