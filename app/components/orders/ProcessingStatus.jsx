'use client'

export default function ProcessingStatus({ status, isProcessing }) {
  return (
    <div className="mt-4">
      {isProcessing ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-gray-600">처리 중...</span>
        </div>
      ) : (
        <div className="text-sm text-gray-600">{status || '파일을 선택해주세요.'}</div>
      )}
    </div>
  )
} 