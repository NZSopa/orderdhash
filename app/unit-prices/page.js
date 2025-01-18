'use client'

import { useState, useEffect } from 'react'
import { FaFileUpload, FaSearch, FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown, FaExclamationTriangle } from 'react-icons/fa'
import * as XLSX from 'xlsx'

export default function UnitPricesPage() {
  const [prices, setPrices] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [sortField, setSortField] = useState('year_month')
  const [sortOrder, setSortOrder] = useState('desc')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPrice, setEditingPrice] = useState(null)
  const [formData, setFormData] = useState({
    product_code: '',
    year_month: '',
    price: 0,
    memo: ''
  })
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    loadPrices()
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder])

  const loadPrices = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortField,
        sortOrder,
        ...(searchQuery && { product_code: searchQuery })
      })

      const response = await fetch(`/api/unit-prices?${queryParams}`)
      const data = await response.json()
      if (data.success) {
        setPrices(data.data || [])
        setTotalItems(data.total || 0)
      } else {
        console.error('Error loading prices:', data.error)
      }
    } catch (error) {
      console.error('Error loading prices:', error)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 년월 형식 검증 (YYYY-MM 또는 YYYY/MM 형식 허용)
    const yearMonthPattern = /^(\d{4})[-/](0?[1-9]|1[0-2])$/
    const match = formData.year_month.match(yearMonthPattern)
    
    if (!match) {
      alert('년월은 YYYY-MM 또는 YYYY/MM 형식으로 입력해주세요. (예: 2024-01, 2024/10)')
      return
    }

    const year = parseInt(match[1])
    const month = parseInt(match[2])

    // 월을 2자리 형식으로 변환 (예: 1 -> 01, 10 -> 10)
    const formattedYearMonth = `${year}-${month.toString().padStart(2, '0')}`
    const submittingData = {
      ...formData,
      year_month: formattedYearMonth
    }

    try {
      const response = await fetch('/api/unit-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price: submittingData })
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setIsModalOpen(false)
        setEditingPrice(null)
        resetFormData()
        await loadPrices()
      } else {
        alert(data.error || '원가 데이터 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving price:', error)
      alert('원가 데이터 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (price) => {
    setEditingPrice(price)
    setFormData({
      product_code: price.product_code || '',
      year_month: price.year_month || '',
      price: price.price || 0,
      memo: price.memo || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (price) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(
        `/api/unit-prices?product_code=${encodeURIComponent(price.product_code)}&year_month=${encodeURIComponent(price.year_month)}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('원가 데이터가 삭제되었습니다.')
        await loadPrices()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting price:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 파일 형식 검사
    const fileExt = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(fileExt)) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          if (jsonData.length === 0) {
            alert('파일에 데이터가 없습니다.')
            setIsUploading(false)
            return
          }

          // 데이터 형식 검증 및 변환
          const prices = jsonData.map(row => ({
            product_code: row['제품코드']?.toString(),
            year_month: row['년월']?.toString(),
            price: parseFloat(row['가격']) || 0,
            memo: row['메모']?.toString() || ''
          })).filter(price => 
            price.product_code && 
            price.year_month && 
            !isNaN(price.price)
          )

          if (prices.length === 0) {
            alert('유효한 데이터가 없습니다. 파일 형식을 확인해주세요.')
            setIsUploading(false)
            return
          }

          // 서버에 데이터 전송
          const response = await fetch('/api/unit-prices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prices })
          })

          const result = await response.json()
          if (result.success) {
            alert(`${prices.length}개의 원가 데이터가 업로드되었습니다.`)
            await loadPrices()
          } else {
            throw new Error(result.error || '업로드 중 오류가 발생했습니다.')
          }
        } catch (error) {
          console.error('Error processing file:', error)
          alert(error.message || '파일 처리 중 오류가 발생했습니다.')
        }
        setIsUploading(false)
      }

      reader.onerror = () => {
        alert('파일 읽기 중 오류가 발생했습니다.')
        setIsUploading(false)
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
      setIsUploading(false)
    }
  }

  const resetFormData = () => {
    setFormData({
      product_code: '',
      year_month: '',
      price: 0,
      memo: ''
    })
  }

  const handleDeleteAll = async () => {
    if (!confirm('모든 원가 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return

    try {
      const response = await fetch('/api/unit-prices?deleteAll=true', {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert(`${data.deletedCount}개의 원가 데이터가 삭제되었습니다.`)
        await loadPrices()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting all prices:', error)
      alert('삭제 중 오류가 발생했습니다.')
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
    if (sortField !== field) return <FaSort className="ml-1" />
    return sortOrder === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
  }

  const renderSortableHeader = (field, label) => (
    <th
      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        {getSortIcon(field)}
      </div>
    </th>
  )

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">원가 관리</h1>
          <p className="mt-2 text-sm text-gray-700">
            제품별 월별 원가를 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="제품 코드로 검색..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-64 pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          <label className={`btn btn-primary ${isUploading ? 'loading' : ''}`}>
            <FaFileUpload className="mr-2" />
            {isUploading ? '업로드 중...' : '엑셀 업로드'}
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingPrice(null)
              resetFormData()
              setIsModalOpen(true)
            }}
          >
            원가 추가
          </button>
          <button
            className="btn btn-error hover:bg-red-600 text-white gap-2"
            onClick={handleDeleteAll}
          >
            <FaExclamationTriangle className="w-4 h-4" />
            전체 삭제
          </button>
        </div>
      </div>

      {/* 원가 목록 테이블 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered w-full max-w-xs"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value="15">15개씩 보기</option>
              <option value="30">30개씩 보기</option>
              <option value="50">50개씩 보기</option>
              <option value="100">100개씩 보기</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              총 {totalItems}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalItems)}개
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                {renderSortableHeader('product_code', '제품 코드')}
                {renderSortableHeader('year_month', '년월')}
                {renderSortableHeader('price', '가격')}
                {renderSortableHeader('memo', '메모')}
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {prices.map((price, index) => (
                <tr key={`${price.product_code}-${price.year_month}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {price.product_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.year_month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {price.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.memo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(price)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(price)}
                        className="text-red-600 hover:text-red-900"
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

        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex justify-between items-center w-full">
            <button
              className="btn btn-sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <span className="text-sm text-gray-700">
              {currentPage} / {totalPages} 페이지
            </span>
            <button
              className="btn btn-sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {/* 원가 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPrice ? '원가 수정' : '원가 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">제품 코드</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.product_code}
                    onChange={(e) =>
                      setFormData({ ...formData, product_code: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">년월 (YYYY-MM 또는 YYYY/MM)</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.year_month}
                    onChange={(e) =>
                      setFormData({ ...formData, year_month: e.target.value })
                    }
                    placeholder="예: 2024-01 또는 2024/10"
                    pattern="\\d{4}[-/]\\d{1,2}"
                    title="YYYY-MM 또는 YYYY/MM 형식으로 입력해주세요. (예: 2024-01, 2024/10)"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    형식: YYYY-MM 또는 YYYY/MM (예: 2024-01, 2024/10)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">가격</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">메모</label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    value={formData.memo}
                    onChange={(e) =>
                      setFormData({ ...formData, memo: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingPrice(null)
                    resetFormData()
                  }}
                >
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPrice ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 