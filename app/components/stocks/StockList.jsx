'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaChevronLeft, FaChevronRight, FaCalendarAlt } from 'react-icons/fa'

export default function StockList() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedDate, setSelectedDate] = useState('')
  const [pageSize, setPageSize] = useState(20)

  const loadStocks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        query: searchQuery,
        date: selectedDate
      })
      
      const response = await fetch(`/api/inventory?${searchParams}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '재고 목록을 불러오는 중 오류가 발생했습니다.')
      }

      setStocks(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(Math.ceil((data.total || 0) / pageSize))
    } catch (error) {
      console.error('Error loading stocks:', error)
      setError(error.message)
      setStocks([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 오늘 날짜 설정
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }, [])

  // 데이터 로드
  useEffect(() => {
    if (selectedDate) {
      loadStocks()
    }
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gradient-to-r from-white to-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="bg-blue-100 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </span>
            재고 목록
          </h2>
          <p className="mt-1 ml-11 text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-full inline-block">
            등록된 모든 재고를 확인하고 검색할 수 있습니다.
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
              placeholder="상품코드, 상품명, 메모 등으로 검색"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : error ? (
        <div className={`rounded-md p-4 ${error === '현재 등록된 재고가 없습니다.' ? 'bg-gray-50' : 'bg-red-50'}`}>
          <div className="flex">
            <div className="ml-3">
              <p className={`text-sm ${error === '현재 등록된 재고가 없습니다.' ? 'text-gray-600' : 'text-red-700'}`}>
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
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
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th scope="col" className="py-4 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">상품코드</th>
                      <th scope="col" className="px-3 py-4 text-left text-sm font-semibold text-gray-900">상품명</th>
                      <th scope="col" className="px-3 py-4 text-left text-sm font-semibold text-gray-900">NZ 재고</th>
                      <th scope="col" className="px-3 py-4 text-left text-sm font-semibold text-gray-900">AUS 재고</th>
                      <th scope="col" className="px-3 py-4 text-left text-sm font-semibold text-gray-900">메모</th>
                      <th scope="col" className="px-3 py-4 text-left text-sm font-semibold text-gray-900">등록일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stocks.map((stock) => (
                      <tr key={stock.id} className="hover:bg-blue-50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{stock.product_code}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{stock.product_name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{stock.nz_stock}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{stock.aus_stock}</td>
                        <td className="px-3 py-4 text-sm text-gray-500">{stock.memo}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(stock.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
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