'use client'

import { useState, useRef } from 'react'
import { FaUpload, FaSpinner } from 'react-icons/fa'
import * as XLSX from 'xlsx'

export default function StockUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
    } else {
      setError('엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.')
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.')
    }
  }

  const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet)

          // 필수 필드 검증
          const requiredFields = ['product_code', 'product_name', 'nz_stock', 'aus_stock']
          const hasAllFields = requiredFields.every(field => 
            Object.keys(jsonData[0]).includes(field)
          )

          if (!hasAllFields) {
            reject(new Error('필수 필드가 누락되었습니다. (product_code, product_name, nz_stock, aus_stock)'))
            return
          }

          resolve(jsonData)
        } catch (error) {
          reject(new Error('엑셀 파일 처리 중 오류가 발생했습니다.'))
        }
      }

      reader.onerror = () => {
        reject(new Error('파일 읽기 중 오류가 발생했습니다.'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file) {
      setError('업로드할 파일을 선택해주세요.')
      return
    }

    setUploading(true)
    setError(null)
    setUploadResult(null)

    try {
      const stockData = await processExcelFile(file)
      
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData)
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '재고 업로드 중 오류가 발생했습니다.')
      }

      const result = await response.json()
      
      const processedResult = {
        success: true,
        total: result.summary?.total || 0,
        success: result.summary?.success || 0,
        error: result.summary?.error || 0,
        duplicates: result.duplicateErrors?.map(error => ({
          product_code: error.product_code,
          message: error.message || '이미 등록된 상품 코드입니다.',
          details: error.details || null
        })) || []
      }

      setUploadResult(processedResult)
      setFile(null)
      if (onUploadComplete) {
        onUploadComplete()
      }

    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message || '파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current.click()
  }

  const renderUploadResult = () => {
    if (!uploadResult) return null

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-4 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">업로드 결과</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">전체</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{uploadResult.total}건</div>
            <div className="mt-1 text-xs text-gray-500">업로드된 전체 재고</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">등록 성공</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">{uploadResult.success}건</div>
            <div className="mt-1 text-xs text-gray-500">정상 처리된 재고</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">등록 실패</div>
            <div className="mt-1 text-2xl font-semibold text-red-600">{uploadResult.error}건</div>
            <div className="mt-1 text-xs text-gray-500">처리 실패한 재고</div>
          </div>
        </div>

        {uploadResult.duplicates?.length > 0 && (
          <div className="mt-6">
            <h4 className="text-base font-medium text-gray-900 mb-3">중복 상품 상세</h4>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-yellow-800">
                  총 {uploadResult.duplicates.length}건의 중복 상품이 발견되었습니다.
                </div>
              </div>

              <div className="space-y-3">
                {uploadResult.duplicates.map((duplicate, index) => (
                  <div key={index} className="bg-white rounded-md p-3 border border-yellow-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                          {index + 1}
                        </span>
                      </div>
                      <div className="ml-3 flex-grow">
                        <div className="text-sm font-medium text-gray-900">
                          상품코드: {duplicate.product_code}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {duplicate.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div 
          className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center
            ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'}
            ${file ? 'bg-green-50 border-green-300' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />
          
          <div className="text-center">
            <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm text-gray-600">
              <button
                type="button"
                onClick={handleButtonClick}
                className="relative font-semibold text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                파일 선택
              </button>
              <p className="pl-1">또는 파일을 여기로 끌어다 놓으세요</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.
            </p>
          </div>

          {file && (
            <div className="mt-4 w-full">
              <h4 className="text-sm font-medium text-gray-700 mb-2">선택된 파일:</h4>
              <div className="text-sm text-gray-600">
                <span className="truncate">{file.name}</span>
                <span className="ml-2 text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            </div>
          )}
        </div>

        {error && (
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
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || uploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                업로드 중...
              </>
            ) : (
              '업로드'
            )}
          </button>
        </div>
      </form>
      {renderUploadResult()}
    </div>
  )
} 