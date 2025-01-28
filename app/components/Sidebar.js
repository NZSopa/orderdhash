'use client'

import Link from 'next/link'
import { FaBox, FaClipboardList, FaStore, FaShoppingCart, FaBars, FaChevronRight, FaChevronDown, FaChartLine, FaCog } from 'react-icons/fa'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '../lib/utils'

const menuItems = [
  {
    name: '주문 관리',
    icon: FaShoppingCart,
    items: [
      { name: '주문 목록', href: '/orders/list' },
      { name: '출하 목록', href: '/shipment/list' },
      { name: '출하 완료', href: '/shipment/completed' },
      

    ],
  },
  {
    name: '재고 관리',
    icon: FaBox,
    items: [
      { name: '재고 목록', href: '/inventory/list' },
    ],
  },
  {
    name: '출품 관리',
    icon: FaStore,
    items: [
      { name: '출품 정보', href: '/codes' },
    ],
  },
  {
    name: '통계',
    icon: FaChartLine,
    items: [
      { name: '이익 계산', href: '/statistics/profit' },
      { name: '판매 현황', href: '/statistics/sales' },
      { name: '재고 현황', href: '/statistics/inventory' },
      { name: '원가 분석', href: '/statistics/cost' },
    ],
  },
  {
    name: '설정',
    icon: FaCog,
    items: [
      { name: '제품 코드 관리', href: '/settings/product-codes' },
      { name: '판매 사이트', href: '/sites' },
      { name: '판매 가격', href: '/prices' },
      { name: '원가 관리', href: '/unit-prices' },
      { name: '재고 업로드', href: '/inventory' },
      { name: '주문 업로드', href: '/orders/bulk' },
    ],
  },
]

export default function Sidebar() {
  const [isMenuOpen, setIsMenuOpen] = useState(true)
  const [openSections, setOpenSections] = useState({})
  const pathname = usePathname()
  const router = useRouter()

  // 현재 경로가 메뉴 항목의 href로 시작하는지 확인
  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`)

  // 현재 섹션이 활성화되어 있는지 확인
  const isSectionActive = (section) => section.items.some(item => isActive(item.href))

  // 초기 섹션 상태 설정
  useEffect(() => {
    const initialOpenSections = {}
    menuItems.forEach((section) => {
      if (isSectionActive(section)) {
        initialOpenSections[section.name] = true
      }
    })
    setOpenSections(initialOpenSections)
  }, [pathname])

  // 섹션 토글 핸들러
  const handleSectionToggle = (sectionName) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }

  // 메뉴 아이템 클릭 핸들러
  const handleMenuItemClick = (href) => {
    router.push(href)
  }

  return (
    <div className="drawer-side z-40">
      <label htmlFor="drawer-toggle" className="drawer-overlay"></label>
      <aside className={cn(
        "bg-base-200 h-full",
        isMenuOpen ? "w-64" : "w-20",
        "transition-all duration-300"
      )}>
        <div className="flex h-full flex-col bg-base-100">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-base-100 border-b border-base-200">
            <div className="flex h-16 items-center gap-4 px-4">
              {isMenuOpen && (
                <Link href="/" className="flex items-center gap-2 font-semibold">
                  Order Dash
                </Link>
              )}
              <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                className="btn btn-square btn-ghost ml-auto"
                aria-label={isMenuOpen ? '메뉴 접기' : '메뉴 펼치기'}
              >
                <FaBars className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 메뉴 */}
          <div className="flex-1 overflow-y-auto">
            <nav className="flex flex-col gap-2 p-4">
              {menuItems.map((section) => (
                <div key={section.name} className="flex flex-col gap-1">
                  <button
                    onClick={() => handleSectionToggle(section.name)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
                      isSectionActive(section)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-base-200 text-base-content"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <section.icon className="h-4 w-4" />
                      {isMenuOpen && <span>{section.name}</span>}
                    </div>
                    {isMenuOpen && (
                      <div className="opacity-75">
                        {openSections[section.name] ? (
                          <FaChevronDown className="h-4 w-4" />
                        ) : (
                          <FaChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </button>

                  {openSections[section.name] && (
                    <div className={cn("flex flex-col gap-1", isMenuOpen ? "ml-4" : "ml-0")}>
                      {section.items.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => handleMenuItemClick(item.href)}
                          className={cn(
                            "flex items-center rounded-lg px-3 py-2 text-sm",
                            isActive(item.href)
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-base-200 text-base-content"
                          )}
                          title={!isMenuOpen ? item.name : undefined}
                        >
                          {isMenuOpen ? (
                            item.name
                          ) : (
                            <span className="w-full text-center">•</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </div>
  )
} 