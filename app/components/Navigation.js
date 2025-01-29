'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path) => {
    return pathname.startsWith(path) ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
  }

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-white font-bold text-xl">
                주문관리
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/orders/list"
                  className={`${isActive('/orders')} rounded-md px-3 py-2 text-sm font-medium`}
                >
                  주문목록
                </Link>
                <Link
                  href="/shipment/list"
                  className={`${isActive('/shipment/list')} rounded-md px-3 py-2 text-sm font-medium`}
                >
                  출하목록
                </Link>
                <Link
                  href="/shipment/completed"
                  className={`${isActive('/shipment/completed')} rounded-md px-3 py-2 text-sm font-medium`}
                >
                  출하완료목록
                </Link>
                <Link
                  href="/unit-prices"
                  className={`${isActive('/unit-prices')} rounded-md px-3 py-2 text-sm font-medium`}
                >
                  단가관리
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 