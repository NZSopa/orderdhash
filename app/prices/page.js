import PriceFileUpload from '../components/prices/PriceFileUpload'

export default function PricePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          아마존 가격 업로드
        </h1>
        <p className="text-gray-600 mb-8">
          아마존 가격 파일을 업로드하여 상품 가격을 일괄 업데이트할 수 있습니다.<br />
          아마존에서 Inventory Report를 다운로드하여 업로드해주세요.
        </p>
        <PriceFileUpload />
      </div>
    </div>
  )
} 