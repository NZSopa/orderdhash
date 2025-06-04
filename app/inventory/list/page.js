'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaChevronLeft, FaChevronRight, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'

export default function InventoryListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [inventoryItems, setInventoryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortField, setSortField] = useState('product_code')
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    loadInventoryItems()
  }, [page, pageSize, searchQuery, sortField, sortOrder])

  const loadInventoryItems = async () => {
    try {
      const url = searchQuery 
        ? `/api/inventory/search?query=${encodeURIComponent(searchQuery)}&page=${page}&pageSize=${pageSize}&sortField=${sortField}&sortOrder=${sortOrder}`
        : `/api/inventory/all?page=${page}&pageSize=${pageSize}&sortField=${sortField}&sortOrder=${sortOrder}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items')
      }
      const data = await response.json()
      setInventoryItems(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      console.error('Error loading inventory items:', error)
      setInventoryItems([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setPage(1)
    // 디바운스 처리
    const timeoutId = setTimeout(() => {
      loadInventoryItems()
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="w-4 h-4 ml-1" />
    return sortOrder === 'asc' ? 
      <FaSortUp className="w-4 h-4 ml-1 text-blue-600" /> : 
      <FaSortDown className="w-4 h-4 ml-1 text-blue-600" />
  }

  const renderSortableHeader = (field, label) => (
    <th 
      scope="col" 
      className="px-3 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        {getSortIcon(field)}
      </div>
    </th>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">재고 목록</h1>
        <p className="mt-2 text-sm text-gray-700">
          등록된 재고 정보를 확인하고 관리할 수 있습니다.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {/* 검색 영역 */}
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

            {/* 페이지 정보 및 페이지 크기 선택 */}
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

            {/* 재고 목록 테이블 */}
            {loading ? (
              <div className="text-center py-4">로딩 중...</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          {renderSortableHeader('product_code', '상품코드')}
                          {renderSortableHeader('product_name', '상품명')}
                          {renderSortableHeader('nz_stock', 'NZ 재고')}
                          {renderSortableHeader('aus_stock', 'AUS 재고')}
                          {renderSortableHeader('total_stock', '총 재고')}
                          {renderSortableHeader('memo', '메모')}
                          {renderSortableHeader('created_at', '등록일')}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {inventoryItems.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                              등록된 재고 정보가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          inventoryItems.map((item, index) => (
                            <tr key={`${item.id}-${index}`} className="hover:bg-blue-50 transition-colors">
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{item.product_code}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{item.product_name}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{item.nz_stock}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{item.aus_stock}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{item.nz_stock + item.aus_stock}</td>
                              <td className="px-3 py-4 text-sm text-gray-500">{item.memo || '-'}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {new Date(item.updated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 모바일용 페이지네이션 */}
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
          </div>
        </div>
      </div>
    </div>
  )
} 