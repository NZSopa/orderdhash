'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FaFileAlt, FaUpload, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

export default function PriceFileUpload() {
  const [file, setFile] = useState(null)
  const [shippingFee, setShippingFee] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/plain') {
      setFile(droppedFile)
    } else {
      alert('TXT 파일만 업로드 가능합니다.')
    }
  }, [])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/plain') {
      setFile(selectedFile)
    } else {
      alert('TXT 파일만 업로드 가능합니다.')
      e.target.value = null
    }
  }

  const handleShippingFeeChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setShippingFee(value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      alert('파일을 선택해주세요.')
      return
    }

    if (!shippingFee) {
      alert('배송비를 입력해주세요.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('shippingFee', shippingFee)

    try {
      const response = await fetch('/api/prices/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('업로드 실패')
      }

      const result = await response.json()
      setUploadResult(result)
      router.refresh()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form 
        onSubmit={handleSubmit} 
        onDragEnter={handleDrag}
        className="space-y-4"
      >
        <div 
          className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ease-in-out
            ${dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : file 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
        >
          <input
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="text-center">
            <FaFileAlt className={`mx-auto h-12 w-12 ${file ? 'text-green-500' : 'text-gray-400'}`} />
            <div className="mt-4">
              {file ? (
                <>
                  <p className="text-sm font-medium text-green-600">{file.name}</p>
                  <p className="mt-1 text-xs text-green-500">
                    파일이 선택되었습니다. 업로드 버튼을 클릭하세요.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-600">
                    아마존 가격 파일(TXT)을 이곳에 드래그하거나 클릭하여 선택하세요
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    .txt 파일만 지원됩니다
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {dragActive && 
          <div 
            className="absolute inset-0 z-20"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          />
        }

        <div className="mt-4">
          <label htmlFor="shippingFee" className="block text-sm font-medium text-gray-700">
            배송비 (¥)
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="shippingFee"
              value={shippingFee}
              onChange={handleShippingFeeChange}
              placeholder="배송비를 입력하세요"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!file || !shippingFee || uploading}
          className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all duration-200
            ${!file || !shippingFee || uploading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              업로드 중...
            </>
          ) : (
            <>
              <FaUpload className="mr-2" />
              업로드
            </>
          )}
        </button>
      </form>

      {uploadResult && (
        <div className={`rounded-md p-4 ${uploadResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {uploadResult.success ? (
                <FaCheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <FaTimesCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {uploadResult.success ? '업로드 완료' : '업로드 실패'}
              </h3>
              {uploadResult.success && (
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>총 데이터 수: {uploadResult.totalCount}개</li>
                    <li>가격 업데이트: {uploadResult.updatedCount}개</li>
                    <li>매칭 실패: {uploadResult.failedCount}개</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 