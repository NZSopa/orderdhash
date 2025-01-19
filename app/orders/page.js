'use client'

import FileUpload from '../components/orders/FileUpload'

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">주문 파일 업로드</h1>
        <p className="mt-2 text-sm text-gray-700">
          야후와 아마존의 주문 파일을 업로드하여 처리할 수 있습니다.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <FileUpload />
        </div>
      </div>
    </div>
  )
} 