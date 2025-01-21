'use client'

import { FaFileUpload } from 'react-icons/fa'
import InventoryFileUpload from '../components/inventory/InventoryFileUpload'

export default function InventoryPage() {
  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm">
        {/* 헤더 섹션 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">재고 관리</h1>
              <p className="mt-1 text-sm text-gray-500">
                엑셀 파일을 업로드하여 재고 정보를 관리할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
                onClick={() => document.getElementById('inventory-file-upload')?.click()}
              >
                <FaFileUpload className="w-4 h-4" />
                재고 파일 업로드
              </button>
            </div>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="p-6">
          <InventoryFileUpload />
        </div>
      </div>
    </div>
  )
} 