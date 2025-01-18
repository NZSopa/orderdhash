'use client'

import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFileExcel, FaChevronLeft, FaChevronRight, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'
import * as XLSX from 'xlsx'

export default function CodesPage() {
  const [codes, setCodes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [editingSite, setEditingSite] = useState(null)
  const [salesSites, setSalesSites] = useState([])
  const [equation, setEquation] = useState('')
  const [answer, setAnswer] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const itemsPerPage = 20
  const [sortField, setSortField] = useState('sales_code')
  const [sortOrder, setSortOrder] = useState('asc')
  const [formData, setFormData] = useState({
    sales_code: '',
    product_name: '',
    set_qty: 1,
    product_code: '',
    sales_price: 0,
    weight: 0,
    sales_site: ''
  })
  const [siteFormData, setSiteFormData] = useState({
    code: '',
    name: ''
  })

  useEffect(() => {
    const init = async () => {
      try {
        // 마이그레이션 실행
        const migrationResponse = await fetch('/api/migrations', { method: 'POST' })
        const migrationData = await migrationResponse.json()
        if (!migrationResponse.ok) {
          console.error('Error running migrations:', migrationData.error)
        }
      } catch (error) {
        console.error('Error running migrations:', error)
      }

      // 데이터 로드
      await loadCodes()
      await loadSalesSites()
    }

    init()
  }, [])

  const loadCodes = async () => {
    try {
      const response = await fetch(
        searchQuery ? 
        `/api/codes?query=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=${itemsPerPage}&sortField=${sortField}&sortOrder=${sortOrder}` : 
        `/api/codes?page=${currentPage}&limit=${itemsPerPage}&sortField=${sortField}&sortOrder=${sortOrder}`
      )
      const data = await response.json()
      if (data.error) {
        console.error('Error loading codes:', data.error)
        return
      }
      setCodes(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(Math.ceil(data.total / itemsPerPage))
    } catch (error) {
      console.error('Error loading codes:', error)
    }
  }

  useEffect(() => {
    loadCodes()
  }, [currentPage, searchQuery, sortField, sortOrder])

  const loadSalesSites = async () => {
    try {
      const response = await fetch('/api/sites')
      const data = await response.json()
      if (data.error) {
        console.error('Error loading sales sites:', data.error)
        return
      }
      setSalesSites(data.data || [])
    } catch (error) {
      console.error('Error loading sales sites:', error)
    }
  }

  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)
    setCurrentPage(1) // 검색 시 첫 페이지로 이동
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: formData })
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setIsModalOpen(false)
        setEditingCode(null)
        resetFormData()
        await loadCodes()
      } else {
        alert(data.error || '코드 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving code:', error)
      alert('코드 저장 중 오류가 발생했습니다.')
    }
  }

  const handleSiteSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteFormData)
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        setIsSiteModalOpen(false)
        setEditingSite(null)
        resetSiteFormData()
        await loadSalesSites()
      } else {
        alert(data.error || '판매 사이트 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving sales site:', error)
      alert('판매 사이트 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (code) => {
    setEditingCode(code)
    setFormData({
      id: code.id || '',
      sales_code: code.sales_code || '',
      product_name: code.product_name || '',
      set_qty: code.set_qty || 1,
      product_code: code.product_code || '',
      sales_price: code.sales_price || 0,
      weight: code.weight || 0,
      sales_site: code.sales_site || ''
    })
    setIsModalOpen(true)
  }

  const handleEditSite = (site) => {
    setEditingSite(site)
    setSiteFormData({
      id: site.id || '',
      code: site.code || '',
      name: site.name || ''
    })
    setIsSiteModalOpen(true)
  }

  const handleDelete = async (salesCode) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/codes?sales_code=${encodeURIComponent(salesCode)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('코드가 삭제되었습니다.')
        await loadCodes()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting code:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteSite = async (code) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/sites?code=${encodeURIComponent(code)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('판매 사이트가 삭제되었습니다.')
        await loadSalesSites()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting sales site:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(worksheet)

      const uniqueData = new Map()
      
      json.forEach(row => {
        const formattedRow = {
          sales_code: String(row.sales_code || ''),
          product_name: String(row.product_name || ''),
          set_qty: Number(row.set_qty || 1),
          product_code: String(row.product_code || ''),
          sales_price: Number(row.sales_price || 0),
          weight: Number(row.weight || 0),
          sales_site: String(row.sales_site || '')
        }
        uniqueData.set(formattedRow.sales_code, formattedRow)
      })

      const formattedData = Array.from(uniqueData.values())

      try {
        const response = await fetch('/api/codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ codes: formattedData })
        })
        
        const data = await response.json()
        if (response.ok && data.success) {
          alert('엑셀 파일이 성공적으로 처리되었습니다.')
          await loadCodes()
        } else {
          alert(data.error || '코드 저장 중 오류가 발생했습니다.')
        }
      } catch (error) {
        console.error('Error saving codes:', error)
        alert('코드 저장 중 오류가 발생했습니다.')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const resetFormData = () => {
    setFormData({
      id: '',
      sales_code: '',
      product_name: '',
      set_qty: 1,
      product_code: '',
      sales_price: 0,
      weight: 0,
      sales_site: ''
    })
  }

  const resetSiteFormData = () => {
    setSiteFormData({
      id: '',
      code: '',
      name: ''
    })
  }

  const handleDeleteAll = async () => {
    try {
      const num1 = Math.floor(Math.random() * 10) + 1
      const num2 = Math.floor(Math.random() * 10) + 1
      const operator = ['+', '-', '*'][Math.floor(Math.random() * 3)]
      let result

      switch (operator) {
        case '+':
          result = num1 + num2
          break
        case '-':
          result = num1 - num2
          break
        case '*':
          result = num1 * num2
          break
      }

      setEquation(`${num1} ${operator} ${num2}`)
      setAnswer(result.toString())
      setIsDeleteModalOpen(true)
    } catch (error) {
      console.error('Error generating equation:', error)
      alert('수식 생성 중 오류가 발생했습니다.')
    }
  }

  const handleVerifyAndDelete = async () => {
    if (!userAnswer) return

    try {
      if (answer !== userAnswer) {
        alert('수식이 올바르지 않습니다. 다시 시도해주세요.')
        return
      }

      const response = await fetch(
        `/api/codes?action=deleteAll&answer=${encodeURIComponent(answer)}&userAnswer=${encodeURIComponent(userAnswer)}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('모든 코드가 성공적으로 삭제되었습니다.')
        setIsDeleteModalOpen(false)
        setUserAnswer('')
        await loadCodes()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting all codes:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">코드 관리</h1>
          <p className="mt-2 text-sm text-gray-700">
            상품 코드와 판매 정보를 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-64 pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          <label className="btn btn-primary">
            <FaFileExcel className="mr-2" />
            엑셀 업로드
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </label>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingCode(null)
              resetFormData()
              setIsModalOpen(true)
            }}
          >
            <FaPlus className="mr-2" />
            코드 추가
          </button>
          <button
            className="btn btn-error"
            onClick={handleDeleteAll}
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {/* 페이지 정보 */}
            <div className="flex items-center justify-between">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm text-gray-700">
                  전체{' '}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    {total}
                  </span>
                  {' '}건 중{' '}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  {' '}-{' '}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {Math.min(currentPage * itemsPerPage, total)}
                  </span>
                  {' '}건
                </p>
              </div>
            </div>

            {/* 코드 목록 테이블 */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        {renderSortableHeader('sales_code', '판매 코드')}
                        {renderSortableHeader('product_name', '상품명')}
                        {renderSortableHeader('set_qty', '세트수량')}
                        {renderSortableHeader('product_code', '상품코드')}
                        {renderSortableHeader('sales_price', '판매가격')}
                        {renderSortableHeader('weight', '무게(kg)')}
                        {renderSortableHeader('sales_site', '판매 사이트')}
                        <th scope="col" className="px-3 py-4 text-left text-sm font-semibold text-gray-900">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {codes.map((code, index) => (
                        <tr 
                          key={`${code.sales_code}-${index}`}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{code.sales_code}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{code.product_name}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{code.set_qty}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{code.product_code}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{code.sales_price.toLocaleString()}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{(code.weight || 0).toFixed(2)}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{code.sales_site}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div className="flex gap-2">
                              <button
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => handleEdit(code)}
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800"
                                onClick={() => handleDelete(code.sales_code)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 페이지네이션 */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    전체 <span className="font-medium">{total}</span> 건 중{' '}
                    <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, total)}</span> 건
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                    >
                      <span className="sr-only">이전</span>
                      <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
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

      {/* 코드 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCode ? '코드 수정' : '코드 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">판매 코드</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.sales_code}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_code: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">상품명</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.product_name}
                    onChange={(e) =>
                      setFormData({ ...formData, product_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">세트수량</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.set_qty}
                    onChange={(e) =>
                      setFormData({ ...formData, set_qty: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">상품코드</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.product_code}
                    onChange={(e) =>
                      setFormData({ ...formData, product_code: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">판매가격</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.sales_price}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_price: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">무게(kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">판매 사이트</label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.sales_site}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_site: e.target.value })
                    }
                  >
                    <option value="">선택하세요</option>
                    {salesSites.map((site) => (
                      <option key={site.code} value={site.code}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingCode(null)
                    resetFormData()
                  }}
                >
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCode ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 전체 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">전체 삭제 확인</h2>
            <p className="mb-4">다음 수식의 답을 입력하세요: {equation}</p>
            <input
              type="number"
              className="input input-bordered w-full mb-4"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="답을 입력하세요"
            />
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setUserAnswer('')
                }}
              >
                취소
              </button>
              <button
                className="btn btn-error"
                onClick={handleVerifyAndDelete}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 