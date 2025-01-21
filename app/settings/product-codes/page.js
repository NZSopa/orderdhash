'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFileExcel, FaImage, FaDownload, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import * as XLSX from 'xlsx'

// 기본 이미지를 base64 문자열로 변경
const DEFAULT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNODAgNjBIMTIwVjE0MEg4MFY2MFoiIGZpbGw9IiM5Q0EzQUYiLz48L3N2Zz4='

// 엑셀 템플릿 데이터
const EXCEL_TEMPLATE = [
  {
    '제품 코드': '',
    '제품명': '',
    '브랜드': '',
    '구입처': '',
    '이미지 URL': '',
    '설명': '',
    '바코드': ''
  }
]

export default function ProductCodesPage() {
  const [productCodes, setProductCodes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    brand: '',
    supplier: '',
    image_url: '',
    description: '',
    barcode: ''
  })
  const [multiFormData, setMultiFormData] = useState([{
    product_code: '',
    product_name: '',
    brand: '',
    supplier: '',
    image_url: '',
    description: '',
    barcode: ''
  }])
  const [showResultModal, setShowResultModal] = useState(false)
  const [registrationResults, setRegistrationResults] = useState(null)
  
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // 제품 코드 목록 불러오기
  const fetchProductCodes = async () => {
    try {
      const response = await fetch(
        `/api/settings/product-codes?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      )
      if (response.ok) {
        const data = await response.json()
        setProductCodes(data.data)
        setTotalPages(data.totalPages)
        setTotalItems(data.total)
        setCurrentPage(data.currentPage)
      }
    } catch (error) {
      console.error('제품 코드 불러오기 실패:', error)
    }
  }

  // 페이지 변경 시 데이터 다시 불러오기
  useEffect(() => {
    fetchProductCodes()
  }, [currentPage, searchTerm])

  // 검색어 변경 시 첫 페이지로 이동
  const handleSearch = (value) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  // 엑셀 템플릿 다운로드
  const handleTemplateDownload = () => {
    const ws = XLSX.utils.json_to_sheet(EXCEL_TEMPLATE)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '제품코드')
    
    // 열 너비 설정
    const wscols = [
      { wch: 15 }, // 제품 코드
      { wch: 20 }, // 제품명
      { wch: 15 }, // 브랜드
      { wch: 15 }, // 구입처
      { wch: 30 }, // 이미지 URL
      { wch: 40 }  // 설명
    ]
    ws['!cols'] = wscols

    XLSX.writeFile(wb, '제품코드_등록_양식.xlsx')
  }

  // 엑셀 파일 업로드 처리
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // 데이터 형식 변환
        const formattedData = jsonData.map(row => ({
          product_code: row['제품 코드'] || row['product_code'] || '',
          product_name: row['제품명'] || row['product_name'] || '',
          brand: row['브랜드'] || row['brand'] || '',
          supplier: row['구입처'] || row['supplier'] || '',
          image_url: row['이미지 URL'] || row['image_url'] || '',
          description: row['설명'] || row['description'] || '',
          barcode: row['바코드'] || row['barcode'] || ''
        }))

        // 서버에 전송
        const response = await fetch('/api/settings/product-codes/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        })

        const result = await response.json()
        if (response.ok) {
          setRegistrationResults(result.results)
          setShowResultModal(true)
          fetchProductCodes()
        } else {
          alert(result.error || '업로드 중 오류가 발생했습니다.')
        }
      } catch (error) {
        console.error('엑셀 파일 처리 중 오류:', error)
        alert('엑셀 파일 처리 중 오류가 발생했습니다.')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // 멀티폼 데이터 처리
  const handleMultiFormChange = (index, field, value) => {
    const newData = [...multiFormData]
    newData[index] = { ...newData[index], [field]: value }
    setMultiFormData(newData)
  }

  const addMultiFormField = () => {
    setMultiFormData([...multiFormData, {
      product_code: '',
      product_name: '',
      brand: '',
      supplier: '',
      image_url: '',
      description: '',
      barcode: ''
    }])
  }

  const removeMultiFormField = (index) => {
    const newData = multiFormData.filter((_, i) => i !== index)
    setMultiFormData(newData)
  }

  // 멀티폼 제출
  const handleMultiSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/settings/product-codes/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(multiFormData),
      })

      const result = await response.json()
      if (response.ok) {
        setRegistrationResults(result.results)
        setShowResultModal(true)
        setIsMultiModalOpen(false)
        setMultiFormData([{
          product_code: '',
          product_name: '',
          brand: '',
          supplier: '',
          image_url: '',
          description: '',
          barcode: ''
        }])
        fetchProductCodes()
      } else {
        alert(result.error || '등록 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('제품 코드 등록 실패:', error)
      alert('등록 중 오류가 발생했습니다.')
    }
  }

  // 단일 제품 코드 추가/수정
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingCode
        ? `/api/settings/product-codes/${editingCode.product_code}`
        : '/api/settings/product-codes'
      
      const method = editingCode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsModalOpen(false)
        setEditingCode(null)
        setFormData({
          product_code: '',
          product_name: '',
          brand: '',
          supplier: '',
          image_url: '',
          description: '',
          barcode: ''
        })
        fetchProductCodes()
      } else {
        const error = await response.json()
        alert(error.message || '저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('제품 코드 저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  // 제품 코드 삭제
  const handleDelete = async (productCode) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`/api/settings/product-codes/${productCode}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          fetchProductCodes()
        } else {
          const error = await response.json()
          alert(error.message || '삭제 중 오류가 발생했습니다.')
        }
      } catch (error) {
        console.error('제품 코드 삭제 실패:', error)
        alert('삭제 중 오류가 발생했습니다.')
      }
    }
  }

  // 수정 모달 열기
  const handleEdit = (code) => {
    setEditingCode(code)
    setFormData({
      product_code: code.product_code,
      product_name: code.product_name,
      brand: code.brand || '',
      supplier: code.supplier || '',
      image_url: code.image_url || '',
      description: code.description || '',
      barcode: code.barcode || ''
    })
    setIsModalOpen(true)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">제품 코드 관리</h1>
        <div className="flex gap-2">
          <button
            onClick={handleTemplateDownload}
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white gap-2"
          >
            <FaDownload /> 엑셀 양식
          </button>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
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
            onClick={() => setIsMultiModalOpen(true)}
            className="btn bg-purple-500 hover:bg-purple-600 text-white gap-2"
          >
            <FaPlus /> 다중 등록
          </button>
          <button
            onClick={() => {
              setEditingCode(null)
              setFormData({
                product_code: '',
                product_name: '',
                brand: '',
                supplier: '',
                image_url: '',
                description: '',
                barcode: ''
              })
              setIsModalOpen(true)
            }}
            className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
          >
            <FaPlus /> 코드 추가
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="제품 코드, 제품명, 브랜드, 구입처로 검색"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border rounded-lg focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      {/* 제품 코드 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이미지
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제품 코드
              </th>
              <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제품명
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                브랜드
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                구입처
              </th>
              <th className="w-36 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                바코드
              </th>
              <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                설명
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productCodes.map((code) => (
              <tr key={code.product_code} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {code.image_url ? (
                      <img
                        src={code.image_url}
                        alt={code.product_name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = DEFAULT_IMAGE
                          e.target.className = "h-full w-full object-contain opacity-50"
                        }}
                      />
                    ) : (
                      <img
                        src={DEFAULT_IMAGE}
                        alt="기본 이미지"
                        className="h-full w-full object-contain opacity-50"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {code.product_code}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {code.product_name}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.brand || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.supplier || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.barcode ? String(code.barcode).replace('.0', '') : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.description || '-'}
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
                      onClick={() => handleDelete(code.product_code)}
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
      <div className="mt-6 flex justify-center items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50"
        >
          이전
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(page => {
            if (totalPages <= 7) return true
            const diff = Math.abs(page - currentPage)
            return diff === 0 || diff === 1 || page === 1 || page === totalPages
          })
          .map((page, index, array) => (
            <React.Fragment key={page}>
              {index > 0 && array[index - 1] !== page - 1 && (
                <span className="px-2">...</span>
              )}
              <button
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded border ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            </React.Fragment>
          ))}
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50"
        >
          다음
        </button>
      </div>

      {/* 단일 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingCode ? '제품 코드 수정' : '제품 코드 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제품 코드
                  </label>
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={editingCode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제품명
                  </label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    브랜드
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    구입처
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이미지 URL
                  </label>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    바코드
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                >
                  {editingCode ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 다중 등록 모달 */}
      {isMultiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">제품 코드 다중 등록</h2>
            <form onSubmit={handleMultiSubmit}>
              <div className="space-y-4">
                {multiFormData.map((data, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">제품 {index + 1}</h3>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeMultiFormField(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          제품 코드
                        </label>
                        <input
                          type="text"
                          value={data.product_code}
                          onChange={(e) => handleMultiFormChange(index, 'product_code', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          제품명
                        </label>
                        <input
                          type="text"
                          value={data.product_name}
                          onChange={(e) => handleMultiFormChange(index, 'product_name', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          브랜드
                        </label>
                        <input
                          type="text"
                          value={data.brand}
                          onChange={(e) => handleMultiFormChange(index, 'brand', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          구입처
                        </label>
                        <input
                          type="text"
                          value={data.supplier}
                          onChange={(e) => handleMultiFormChange(index, 'supplier', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          이미지 URL
                        </label>
                        <input
                          type="text"
                          value={data.image_url}
                          onChange={(e) => handleMultiFormChange(index, 'image_url', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          바코드
                        </label>
                        <input
                          type="text"
                          value={data.barcode}
                          onChange={(e) => handleMultiFormChange(index, 'barcode', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          설명
                        </label>
                        <textarea
                          value={data.description}
                          onChange={(e) => handleMultiFormChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={addMultiFormField}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 border border-blue-500 rounded-lg hover:bg-blue-50"
                >
                  + 제품 추가
                </button>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMultiModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                >
                  일괄 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 결과 모달 */}
      {showResultModal && registrationResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">등록 결과</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-blue-600">전체</div>
                  <div className="text-xl font-bold text-blue-700">{registrationResults.total}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-green-600">성공</div>
                  <div className="text-xl font-bold text-green-700">{registrationResults.success}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-red-600">실패</div>
                  <div className="text-xl font-bold text-red-700">{registrationResults.failed}</div>
                </div>
              </div>
              
              {registrationResults.failed > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">오류 내역</h3>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">제품 코드</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">오류 사유</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {registrationResults.errors.map((error, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{error.product_code}</td>
                            <td className="px-3 py-2 text-sm text-red-600">{error.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 