'use client'

import React, { useState, useEffect } from 'react'
import { FaFileUpload, FaSearch, FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown, FaExclamationTriangle, FaPlus, FaFileExcel, FaDownload } from 'react-icons/fa'
import * as XLSX from 'xlsx'

const EXCEL_TEMPLATE = [
  {
    '판매 코드': '',
    '상품명': '',
    '세트 수량': '',
    '제품 코드': '',
    '판매가': '',
    '중량(g)': '',
    '판매 사이트': '',
    '상품 URL': '',
    '배송국가': 'nz',
  }
]

export default function CodesPage() {
  const [codes, setCodes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [sortField, setSortField] = useState('product_code')
  const [sortOrder, setSortOrder] = useState('asc')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [formData, setFormData] = useState({
    sales_code: '',
    product_name: '',
    set_qty: '',
    product_code: '',
    sales_price: '',
    weight: '',
    sales_site: '',
    site_url: '',
    brand: '',
    supplier: '',
    image_url: '',
    description: '',
    shipping_country: 'nz'
  })
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    loadCodes()
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder])

  const loadCodes = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortField,
        sortOrder,
        ...(searchQuery && { query: searchQuery })
      })

      const response = await fetch(`/api/codes?${queryParams}`)
      const data = await response.json()
      
      if (response.ok) {
        setCodes(data.data || [])
        setTotalItems(data.total || 0)
        setCurrentPage(data.currentPage || 1)
      } else {
        console.error('Error loading codes:', data.error)
      }
    } catch (error) {
      console.error('Error loading codes:', error)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: formData
        })
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setIsModalOpen(false)
        setEditingCode(null)
        resetFormData()
        await loadCodes()
      } else {
        alert(data.error || '제품 코드 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving code:', error)
      alert('제품 코드 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (code) => {
    setEditingCode(code)
    setFormData({
      sales_code: code.sales_code,
      product_name: code.product_name,
      set_qty: code.set_qty,
      product_code: code.product_code,
      sales_price: code.sales_price,
      weight: code.weight,
      sales_site: code.sales_site,
      site_url: code.site_url,
      brand: code.brand || '',
      supplier: code.supplier || '',
      image_url: code.image_url || '',
      description: code.description || '',
      shipping_country: code.shipping_country || 'nz'
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (code) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(
        `/api/codes?sales_code=${encodeURIComponent(code.sales_code)}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('제품 코드가 삭제되었습니다.')
        await loadCodes()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting code:', error)
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
          const codes = jsonData.map(row => ({
            sales_code: row['판매 코드']?.toString(),
            product_name: row['상품명']?.toString(),
            set_qty: row['세트 수량']?.toString() || '',
            product_code: row['제품 코드']?.toString(),
            sales_price: row['판매가']?.toString() || '',
            weight: row['중량(g)']?.toString() || '',
            sales_site: row['판매 사이트']?.toString() || '',
            site_url: row['상품 URL']?.toString() || '',
            brand: row['브랜드']?.toString() || '',
            supplier: row['공급사']?.toString() || '',
            image_url: row['이미지 URL']?.toString() || '',
            description: row['설명']?.toString() || '',
            shipping_country: row['배송국가']?.toString()?.toLowerCase() || 'nz'
          })).filter(code => 
            code.product_code && 
            code.product_name &&
            (!code.shipping_country || code.shipping_country === 'aus' || code.shipping_country === 'nz')
          )

          if (codes.length === 0) {
            alert('유효한 데이터가 없습니다. 파일 형식을 확인해주세요.')
            setIsUploading(false)
            return
          }

          // 서버에 데이터 전송
          const response = await fetch('/api/codes/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codes })
          })

          const result = await response.json()
          if (result.success) {
            alert(`${codes.length}개의 제품 코드가 업로드되었습니다.`)
            await loadCodes()
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
      sales_code: '',
      product_name: '',
      set_qty: '',
      product_code: '',
      sales_price: '',
      weight: '',
      sales_site: '',
      site_url: '',
      brand: '',
      supplier: '',
      image_url: '',
      description: '',
      shipping_country: 'nz'
    })
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

  const handleTemplateDownload = () => {
    try {
      // 워크북 생성
      const wb = XLSX.utils.book_new()
      
      // 워크시트 생성
      const ws = XLSX.utils.json_to_sheet(EXCEL_TEMPLATE)
      
      // 열 너비 설정
      const colWidths = [
        { wch: 15 }, // 제품 코드
        { wch: 30 }, // 제품명
        { wch: 15 }, // 브랜드
        { wch: 15 }, // 공급사
        { wch: 50 }, // 이미지 URL
        { wch: 50 }, // 설명
      ]
      ws['!cols'] = colWidths

      // 워크북에 워크시트 추가
      XLSX.utils.book_append_sheet(wb, ws, '제품 코드 템플릿')
      
      // 파일 다운로드
      XLSX.writeFile(wb, '제품코드_템플릿.xlsx')
    } catch (error) {
      console.error('템플릿 다운로드 중 오류 발생:', error)
      alert('템플릿 다운로드 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm">
        {/* 헤더 섹션 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">출품 정보 관리</h1>
              <p className="mt-1 text-sm text-gray-500">
                판매 사이트별 출품 정보를 관리할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="판매코드 또는 상품명으로 검색..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
              <button
                onClick={handleTemplateDownload}
                className="btn bg-indigo-500 hover:bg-indigo-600 text-white gap-2"
              >
                <FaDownload /> 엑셀 양식
              </button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="btn bg-green-500 hover:bg-green-600 text-white gap-2 cursor-pointer"
              >
                <FaFileExcel /> 엑셀 업로드
              </label>
              <button
                className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
                onClick={() => {
                  setEditingCode(null)
                  resetFormData()
                  setIsModalOpen(true)
                }}
              >
                <FaPlus className="w-4 h-4" />
                출품 정보 추가
              </button>
            </div>
          </div>
        </div>

        {/* 테이블 컨트롤 */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
          <select
            className="select select-bordered select-sm w-40"
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
          <span className="text-sm text-gray-600">
            총 <span className="font-medium">{totalItems}</span>개 중{' '}
            <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>-
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>개
          </span>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                {renderSortableHeader('sales_code', '판매 코드')}
                {renderSortableHeader('product_name', '상품명')}
                {renderSortableHeader('set_qty', '세트 수량')}
                {renderSortableHeader('product_code', '제품 코드')}
                {renderSortableHeader('sales_price', '판매가')}
                {renderSortableHeader('weight', '중량(kg)')}
                {renderSortableHeader('sales_site', '판매 사이트')}
                {renderSortableHeader('shipping_country', '배송국가')}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품 URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes.map((code) => (
                <tr 
                  key={code.sales_code}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {code.sales_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.set_qty || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.product_code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.sales_price ? 
                      `${code.sales_price.toLocaleString()}${
                        code.sales_site === 'AMZ_NZP' || code.sales_site === 'ebay' 
                          ? ' USD' 
                          : ' ¥'
                      }` 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.weight ? `${code.weight}kg` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.sales_site || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.shipping_country ? code.shipping_country.toUpperCase() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.site_url ? (
                      <a 
                        href={code.site_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        링크
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(code)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(code)}
                        className="text-red-600 hover:text-red-800"
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

        {/* 페이지네이션 */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <span className="text-sm text-gray-700">
              <span className="font-medium">{currentPage}</span> / {totalPages} 페이지
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCode ? '출품 정보 수정' : '출품 정보 추가'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingCode(null)
                  resetFormData()
                }}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-6">
                {/* 왼쪽 섹션 */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">기본 정보</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      판매 코드 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.sales_code}
                      onChange={(e) =>
                        setFormData({ ...formData, sales_code: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상품명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.product_name}
                      onChange={(e) =>
                        setFormData({ ...formData, product_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제품 코드
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.product_code}
                      onChange={(e) =>
                        setFormData({ ...formData, product_code: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      세트 수량
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.set_qty}
                      onChange={(e) =>
                        setFormData({ ...formData, set_qty: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      판매가
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.sales_price}
                      onChange={(e) =>
                        setFormData({ ...formData, sales_price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      중량(kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* 오른쪽 섹션 */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">판매 정보</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      판매 사이트
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.sales_site}
                      onChange={(e) =>
                        setFormData({ ...formData, sales_site: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상품 URL
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.site_url}
                      onChange={(e) =>
                        setFormData({ ...formData, site_url: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      배송국가
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.shipping_country}
                      onChange={(e) =>
                        setFormData({ ...formData, shipping_country: e.target.value })
                      }
                    >
                      <option value="">선택</option>
                      <option value="aus">AUS</option>
                      <option value="nz">NZ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      브랜드
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      공급사
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData({ ...formData, supplier: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이미지 URL
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.image_url}
                      onChange={(e) =>
                        setFormData({ ...formData, image_url: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* 설명 필드 - 전체 너비 사용 */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows="4"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingCode(null)
                    resetFormData()
                  }}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {editingCode ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 