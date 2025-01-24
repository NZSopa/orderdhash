'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { FaFileAlt, FaUpload, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

export default function PriceFileUpload({ type = 'amazon', inputId }) {
  const [isUploading, setIsUploading] = useState(false)
  const [shippingFee, setShippingFee] = useState(0)
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)

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
    const fileExt = droppedFile?.name.split('.').pop().toLowerCase()
    const validExt = type === 'amazon' ? ['xlsx', 'xls'] : ['csv']
    
    if (droppedFile && validExt.includes(fileExt)) {
      setFile(droppedFile)
    } else {
      toast.error(`${validExt.join(', ')} 파일만 업로드 가능합니다.`)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 확장자 체크
    const fileExt = file.name.split('.').pop().toLowerCase()
    const validExt = type === 'amazon' ? ['xlsx', 'xls'] : ['csv']
    
    if (!validExt.includes(fileExt)) {
      toast.error(`${validExt.join(', ')} 파일만 업로드 가능합니다.`)
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      if (type === 'amazon') {
        formData.append('shippingFee', shippingFee)
      }

      const response = await fetch('/api/prices/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message)
      }

      toast.success(
        `총 ${result.totalCount}건 중 ${result.updatedCount}건이 업데이트되었습니다.` +
        (result.failedCount > 0 ? ` (${result.failedCount}건 실패)` : '')
      )
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error(error.message || '파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      e.target.value = '' // 파일 입력 초기화
    }
  }

  return (
    <div className="space-y-6">
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleFileChange({ target: { files: [file] } });
        }}
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
            id={inputId}
            accept={type === 'amazon' ? '.xlsx,.xls' : '.csv'}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={isUploading}
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
                    {type === 'amazon' 
                      ? '아마존 가격 파일(xlsx, xls)을 이곳에 드래그하거나 클릭하여 선택하세요'
                      : 'Yahoo 가격 파일(csv)을 이곳에 드래그하거나 클릭하여 선택하세요'
                    }
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {type === 'amazon' 
                      ? '.xlsx, .xls 파일만 지원됩니다'
                      : '.csv 파일만 지원됩니다'
                    }
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

        {type === 'amazon' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              배송비 (¥)
            </label>
            <input
              type="number"
              value={shippingFee}
              onChange={(e) => setShippingFee(parseInt(e.target.value) || 0)}
              className="w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!file || isUploading}
          className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all duration-200
            ${!file || isUploading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isUploading ? (
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

      {isUploading && (
        <div className="text-sm text-gray-500">
          파일 업로드 중...
        </div>
      )}
    </div>
  )
} 