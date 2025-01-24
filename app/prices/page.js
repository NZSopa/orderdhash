'use client'

import { FaFileUpload } from 'react-icons/fa'
import PriceFileUpload from '@/app/components/prices/PriceFileUpload'

export default function PricePage() {
  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 아마존 가격 업로드 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">아마존 가격 관리</h1>
                <p className="mt-1 text-sm text-gray-500">
                  아마존 가격 파일을 업로드하여 상품 가격을 일괄 업데이트할 수 있습니다.<br />
                  아마존에서 Inventory Report를 다운로드하여 업로드해주세요.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
                  onClick={() => document.getElementById('amazon-price-file-upload')?.click()}
                >
                  <FaFileUpload className="w-4 h-4" />
                  가격 파일 업로드
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <PriceFileUpload type="amazon" inputId="amazon-price-file-upload" />
          </div>
        </div>

        {/* Yahoo 가격 업로드 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yahoo 가격 관리</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Yahoo 가격 파일(.csv)을 업로드하여 상품 가격을 일괄 업데이트할 수 있습니다.<br />
                  code와 price 칼럼이 포함된 CSV 파일을 업로드해주세요.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
                  onClick={() => document.getElementById('yahoo-price-file-upload')?.click()}
                >
                  <FaFileUpload className="w-4 h-4" />
                  가격 파일 업로드
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <PriceFileUpload type="yahoo" inputId="yahoo-price-file-upload" />
          </div>
        </div>
      </div>
    </div>
  )
} 