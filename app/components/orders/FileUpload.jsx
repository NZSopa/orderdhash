'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FaFileUpload } from 'react-icons/fa'
import OrderPreview from './OrderPreview'

export default function FileUpload({ onUploadSuccess = () => {} }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [orderType, setOrderType] = useState('yahoo')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [processedOrders, setProcessedOrders] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    if (orderType === 'yahoo') {
      const hasOrderFile = acceptedFiles.some(file => 
        file.name.startsWith('YahooOrder'))
      const hasProductFile = acceptedFiles.some(file => 
        file.name.startsWith('YahooProduct'))

      if (!hasOrderFile || !hasProductFile) {
        setError('야후 주문은 YahooOrder와 YahooProduct 파일이 모두 필요합니다.')
        return
      }
    }
    setSelectedFiles(acceptedFiles)
    setError(null)
    setUploadResult(null)
    setProcessedOrders(null)
  }, [orderType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true 
  })

  const handleOrderTypeChange = (e) => {
    setOrderType(e.target.value)
    setSelectedFiles([])
    setError(null)
    setUploadResult(null)
    setProcessedOrders(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedFiles.length === 0) {
      setError('파일을 선택해주세요.')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadResult(null)
    setProcessedOrders(null)

    try {
      const formData = new FormData()
      formData.append('orderType', orderType)
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/orders/process', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '파일 처리 중 오류가 발생했습니다.')
      }

      if (result.error) {
        throw new Error(result.error)
      }

      setSelectedFiles([])
      setUploadResult({
        success: true,
        message: result.message,
        count: result.count
      })
      setProcessedOrders(result.data)
      if (typeof onUploadSuccess === 'function') {
        onUploadSuccess(result.data)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message || '파일 업로드 중 오류가 발생했습니다.')
      setUploadResult({
        success: false,
        message: error.message
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <select
          value={orderType}
          onChange={handleOrderTypeChange}
          className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="yahoo">야후</option>
          <option value="amazon">아마존</option>
        </select>

        <button
          onClick={handleSubmit}
          disabled={isUploading || selectedFiles.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {isUploading ? (
            <span>업로드 중...</span>
          ) : (
            <>
              <FaFileUpload className="mr-2" />
              <span>업로드</span>
            </>
          )}
        </button>
      </div>

      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}
          ${error ? 'border-red-500' : ''}
          ${uploadResult?.success ? 'border-green-500' : ''}`}
      >
        <input {...getInputProps()} />
        {selectedFiles.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">선택된 파일:</p>
            {selectedFiles.map((file, index) => (
              <p key={index} className="text-sm text-gray-700">{file.name}</p>
            ))}
          </div>
        ) : (
          <div>
            {isDragActive ? (
              <p className="text-sm text-gray-600">파일을 여기에 놓으세요...</p>
            ) : (
              <p className="text-sm text-gray-500">
                {orderType === 'yahoo' 
                  ? 'YahooOrder와 YahooProduct 파일을 드래그하거나 클릭하여 선택하세요'
                  : '아마존 주문 파일을 드래그하거나 클릭하여 선택하세요'}
              </p>
            )}
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

      {uploadResult && (
        <div className={`rounded-md ${uploadResult.success ? 'bg-green-50' : 'bg-red-50'} p-4`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {uploadResult.success ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm ${uploadResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {uploadResult.message}
                {uploadResult.success && uploadResult.count && (
                  <span className="ml-2">
                    (처리된 주문: {uploadResult.count}건)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {processedOrders && <OrderPreview orders={processedOrders} />}
    </div>
  )
} 