import Image from "next/image";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">대시보드</h1>
      
      {/* 통계 카드 섹션 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">총 주문</dt>
                  <dd className="text-lg font-semibold text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-100 text-green-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">처리 완료</dt>
                  <dd className="text-lg font-semibold text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-red-100 text-red-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">오류</dt>
                  <dd className="text-lg font-semibold text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 파일 섹션 */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900">최근 업로드된 파일</h2>
          <div className="mt-6">
            <div className="text-center text-sm text-gray-500">
              아직 업로드된 파일이 없습니다.
            </div>
          </div>
        </div>
      </div>

      {/* 알림 섹션 */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900">알림</h2>
          <div className="mt-6">
            <div className="text-center text-sm text-gray-500">
              새로운 알림이 없습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
