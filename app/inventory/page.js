'use client'

import InventoryFileUpload from '../components/inventory/InventoryFileUpload'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">재고 파일 업로드</h1>
        <p className="mt-2 text-sm text-gray-700">
          엑셀 파일을 업로드하여 재고 정보를 관리할 수 있습니다.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <InventoryFileUpload />
        </div>
      </div>
    </div>
  )
} 