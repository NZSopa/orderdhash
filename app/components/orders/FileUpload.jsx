'use client'

import { useState, useRef } from 'react'
import { FaUpload, FaSpinner } from 'react-icons/fa'

export default function FileUpload({ onUploadComplete }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [orderType, setOrderType] = useState('yahoo')
  const [dragActive, setDragActive] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
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
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(droppedFiles)
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(selectedFiles)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!files.length) {
      setError('업로드할 파일을 선택해주세요.')
      return
    }

    if (orderType === 'yahoo') {
      const hasOrderFile = files.some(file => file.name.toLowerCase().includes('yahooorder'))
      const hasProductFile = files.some(file => file.name.toLowerCase().includes('yahooproduct'))
      
      if (!hasOrderFile || !hasProductFile) {
        setError('Yahoo 주문은 YahooOrder와 YahooProduct 파일이 모두 필요합니다.')
        return
      }
    } else if (orderType === 'amazon') {
      if (files.length !== 1) {
        setError('Amazon 주문은 하나의 파일만 선택해주세요.')
        return
      }
    }

    setUploading(true)
    setError(null)
    setUploadResult(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30초 타임아웃

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      formData.append('orderType', orderType)

      console.log('Uploading files:', files.map(f => ({ name: f.name, size: f.size })))
      console.log('Order type:', orderType)

      const response = await fetch('/api/orders/process', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
        signal: controller.signal,
        // cache: 'no-store',
        // next: { revalidate: 0 }
      }).catch(error => {
        if (error.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
        }
        throw error
      })

      clearTimeout(timeoutId)

      if (!response) {
        throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.')
      }

      console.log('Response status:', response.status)
      
      let result
      try {
        const text = await response.text()
        console.log('Raw response:', text)
        
        if (!text) {
          throw new Error('서버로부터 빈 응답을 받았습니다.')
        }
        
        try {
          result = JSON.parse(text)
          console.log('Parsed result:', result)
        } catch (parseError) {
          console.error('JSON parsing error:', parseError)
          throw new Error('서버 응답을 처리할 수 없습니다. 응답 형식이 올바르지 않습니다.')
        }
      } catch (responseError) {
        console.error('Response reading error:', responseError)
        throw new Error('서버 응답을 읽는 중 오류가 발생했습니다.')
      }

      if (!response.ok) {
        throw new Error(result.error || `파일 업로드 중 오류가 발생했습니다. (${response.status})`)
      }

      const processedResult = {
        success: true,
        total: result.summary?.total || 0,
        success: result.summary?.success || 0,
        error: result.summary?.error || 0,
        duplicates: result.duplicateErrors?.map(error => ({
          reference_no: error.reference_no,
          message: error.message || '이미 등록된 주문 번호가 존재합니다.',
          sales_site: error.sales_site || orderType,
          details: error.details || null,
          products: error.products || []
        })) || []
      }

      console.log('Processed result:', processedResult)
      setUploadResult(processedResult)
      setFiles([])

    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message || '파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      clearTimeout(timeoutId)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current.click()
  }

  const renderUploadResult = () => {
    if (!uploadResult) {
      return null
    }

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-4 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">업로드 결과</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">전체 주문</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{uploadResult.total}건</div>
            <div className="mt-1 text-xs text-gray-500">업로드된 전체 주문</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">등록 성공</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">{uploadResult.success}건</div>
            <div className="mt-1 text-xs text-gray-500">정상 처리된 주문</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">등록 실패</div>
            <div className="mt-1 text-2xl font-semibold text-red-600">{uploadResult.error}건</div>
            <div className="mt-1 text-xs text-gray-500">
              처리 실패한 주문
            </div>
          </div>
        </div>

        {uploadResult.duplicates?.length > 0 && (
          <div className="mt-6">
            <h4 className="text-base font-medium text-gray-900 mb-3">중복 주문 상세</h4>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-yellow-800">
                  총 {uploadResult.duplicates.length}건의 중복 주문이 발견되었습니다.
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
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              주문번호: {duplicate.reference_no}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {duplicate.message}
                            </div>
                          </div>
                          {duplicate.sales_site && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {duplicate.sales_site}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-white rounded-lg border border-yellow-100">
                <div className="text-sm font-medium text-gray-900 mb-2">중복 주문 처리 안내</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>중복 주문은 기존 주문과 동일한 주문번호를 가진 주문입니다.</li>
                  <li>중복 주문은 자동으로 필터링되어 처리되지 않습니다.</li>
                  <li>이미 처리된 주문인것으로 보입니다. 업로드한 주문 리스트를 확인해주세요.</li>
                </ul>
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
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">주문 유형</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="yahoo"
                checked={orderType === 'yahoo'}
                onChange={(e) => {
                  setOrderType(e.target.value)
                  setFiles([])
                  setError(null)
                  setUploadResult(null)
                }}
                className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Yahoo</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="amazon"
                checked={orderType === 'amazon'}
                onChange={(e) => {
                  setOrderType(e.target.value)
                  setFiles([])
                  setError(null)
                  setUploadResult(null)
                }}
                className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Amazon</span>
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {orderType === 'yahoo' 
              ? 'YahooOrder와 YahooProduct 파일을 모두 선택해주세요.' 
              : 'CSV 또는 TXT 형식의 주문 파일을 선택해주세요.'}
          </p>
        </div>

        <div 
          className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center
            ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'}
            ${files.length > 0 ? 'bg-green-50 border-green-300' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
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
          </div>

          {files.length > 0 && (
            <div className="mt-4 w-full">
              <h4 className="text-sm font-medium text-gray-700 mb-2">선택된 파일:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center">
                    <span className="truncate">{file.name}</span>
                    <span className="ml-2 text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </li>
                ))}
              </ul>
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
            disabled={files.length === 0 || uploading}
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