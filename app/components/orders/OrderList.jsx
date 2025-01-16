'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa'

export default function OrderList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/orders?page=${page}&search=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '주문 목록을 불러오는 중 오류가 발생했습니다.')
      }

      setOrders(data.data)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (error) {
      console.error('Error loading orders:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [page, searchQuery])

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">주문 목록</h2>
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
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">주문번호</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">상품코드</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">상품명</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">수량</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">수취인</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">우편번호</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">주소</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">연락처</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">단가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {orders.map((order, index) => (
                      <tr key={`${order.reference_no}-${index}`} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">{order.reference_no}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.sku}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.product_name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.quantity}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          <div>{order.consignee_name}</div>
                          <div className="text-gray-500">{order.kana}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.post_code}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.address}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.phone_number}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.unit_value?.toLocaleString()}</td>
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
                  <span className="font-medium">{(page - 1) * 20 + 1}</span> -{' '}
                  <span className="font-medium">{Math.min(page * 20, total)}</span> 건
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