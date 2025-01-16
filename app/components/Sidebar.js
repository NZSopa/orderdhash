'use client'

import Link from 'next/link'
import { FaBox, FaClipboardList, FaStore, FaShoppingCart, FaBars, FaChevronRight, FaChevronDown, FaHome, FaUpload, FaList } from 'react-icons/fa'
import { useState, useEffect } from 'react'
import { Disclosure } from '@headlessui/react'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isInventoryOpen, setIsInventoryOpen] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 1024
      setIsMobile(isMobileView)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const toggleInventory = () => {
    setIsInventoryOpen(!isInventoryOpen)
  }

  const isActive = (path) => pathname === path

  return (
    <aside 
      className={`
        h-full bg-base-200 flex-shrink-0
        transition-all duration-500 ease-in-out
        ${isMenuOpen ? 'w-80' : 'w-16'}
        shadow-xl
      `}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 h-16">
          <button 
            className="btn btn-circle btn-ghost min-w-[40px] min-h-[40px] h-10 w-10"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            <FaBars className="w-6 h-6 min-w-[24px]" />
          </button>
          <h1 className={`ml-4 text-xl font-bold transition-all duration-500 ease-in-out ${isMenuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'} whitespace-nowrap overflow-hidden`}>
            메뉴
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-0 hover:scrollbar-thin hover:scrollbar-track-base-200 hover:scrollbar-thumb-base-300">
          <ul className="space-y-2">
            <li>
              <Link 
                href="/" 
                className={`
                  flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg
                  ${!isMenuOpen && 'justify-center'}
                  min-h-[40px]
                  ${isActive('/') ? 'bg-base-300' : ''}
                `}
                onClick={() => isMobile && toggleMenu()}
                title="홈"
              >
                <FaHome className={`w-6 h-6 min-w-[24px] ${isActive('/') ? 'text-primary' : ''}`} />
                <span className={`transition-all duration-500 ${isMenuOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'} whitespace-nowrap overflow-hidden`}>홈</span>
              </Link>
            </li>
            <li>
              <Disclosure as="div" defaultOpen={pathname.startsWith('/orders')}>
                {({ open }) => (
                  <div>
                    <Disclosure.Button 
                      className={`
                        flex items-center w-full p-2 hover:bg-base-300 rounded-lg font-medium
                        ${!isMenuOpen ? 'justify-center' : 'justify-between'}
                        min-h-[40px]
                        ${pathname.startsWith('/orders') ? 'bg-base-300' : ''}
                      `}
                      title="주문 관리"
                    >
                      <div className="flex items-center gap-2">
                        <FaShoppingCart className={`w-6 h-6 min-w-[24px] ${pathname.startsWith('/orders') ? 'text-primary' : ''}`} />
                        <span className={`transition-all duration-500 ${isMenuOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'} whitespace-nowrap overflow-hidden`}>주문 관리</span>
                      </div>
                      {isMenuOpen && (open ? <FaChevronDown className="w-4 h-4 min-w-[16px]" /> : <FaChevronRight className="w-4 h-4 min-w-[16px]" />)}
                    </Disclosure.Button>
                    {isMenuOpen ? (
                      <Disclosure.Panel className="pl-4 space-y-1">
                        <Link
                          href="/orders"
                          className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/orders') ? 'bg-base-300' : ''}`}
                          onClick={() => isMobile && toggleMenu()}
                        >
                          <FaUpload className={`w-4 h-4 min-w-[16px] ${isActive('/orders') ? 'text-primary' : ''}`} />
                          <span>파일 업로드</span>
                        </Link>
                        <Link
                          href="/orders/list"
                          className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/orders/list') ? 'bg-base-300' : ''}`}
                          onClick={() => isMobile && toggleMenu()}
                        >
                          <FaList className={`w-4 h-4 min-w-[16px] ${isActive('/orders/list') ? 'text-primary' : ''}`} />
                          <span>주문 목록</span>
                        </Link>
                      </Disclosure.Panel>
                    ) : open && (
                      <div className="absolute left-full top-[0.5rem] ml-2 bg-base-200 rounded-lg shadow-xl p-2 min-w-[160px] z-50">
                        <div className="space-y-1">
                          <Link
                            href="/orders"
                            className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/orders') ? 'bg-base-300' : ''}`}
                            onClick={() => isMobile && toggleMenu()}
                          >
                            <FaUpload className={`w-4 h-4 min-w-[16px] ${isActive('/orders') ? 'text-primary' : ''}`} />
                            <span>파일 업로드</span>
                          </Link>
                          <Link
                            href="/orders/list"
                            className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/orders/list') ? 'bg-base-300' : ''}`}
                            onClick={() => isMobile && toggleMenu()}
                          >
                            <FaList className={`w-4 h-4 min-w-[16px] ${isActive('/orders/list') ? 'text-primary' : ''}`} />
                            <span>주문 목록</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Disclosure>
            </li>
            <li className="space-y-1">
              <button 
                onClick={toggleInventory}
                className={`
                  flex items-center w-full p-2 hover:bg-base-300 rounded-lg font-medium
                  ${!isMenuOpen ? 'justify-center' : 'justify-between'}
                  min-h-[40px]
                  ${pathname.startsWith('/inventory') || pathname.startsWith('/codes') || pathname.startsWith('/sites') ? 'bg-base-300' : ''}
                `}
                title="재고 관리"
              >
                <div className="flex items-center gap-2">
                  <FaBox className={`w-6 h-6 min-w-[24px] ${pathname.startsWith('/inventory') || pathname.startsWith('/codes') || pathname.startsWith('/sites') ? 'text-primary' : ''}`} />
                  <span className={`transition-all duration-500 ${isMenuOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'} whitespace-nowrap overflow-hidden`}>재고 관리</span>
                </div>
                {isMenuOpen && (isInventoryOpen ? <FaChevronDown className="w-4 h-4 min-w-[16px]" /> : <FaChevronRight className="w-4 h-4 min-w-[16px]" />)}
              </button>
              {isMenuOpen ? (
                isInventoryOpen && (
                  <ul className="pl-4 space-y-1">
                    <li>
                      <Link
                        href="/inventory"
                        className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/inventory') ? 'bg-base-300' : ''}`}
                        onClick={() => isMobile && toggleMenu()}
                      >
                        <FaClipboardList className={`w-4 h-4 min-w-[16px] ${isActive('/inventory') ? 'text-primary' : ''}`} />
                        <span>재고 목록</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/codes"
                        className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/codes') ? 'bg-base-300' : ''}`}
                        onClick={() => isMobile && toggleMenu()}
                      >
                        <FaList className={`w-4 h-4 min-w-[16px] ${isActive('/codes') ? 'text-primary' : ''}`} />
                        <span>코드 관리</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/sites"
                        className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/sites') ? 'bg-base-300' : ''}`}
                        onClick={() => isMobile && toggleMenu()}
                      >
                        <FaStore className={`w-4 h-4 min-w-[16px] ${isActive('/sites') ? 'text-primary' : ''}`} />
                        <span>사이트 관리</span>
                      </Link>
                    </li>
                  </ul>
                )
              ) : isInventoryOpen && (
                <div className="absolute left-full top-[0.5rem] ml-2 bg-base-200 rounded-lg shadow-xl p-2 min-w-[160px] z-50">
                  <div className="space-y-1">
                    <Link
                      href="/inventory"
                      className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/inventory') ? 'bg-base-300' : ''}`}
                      onClick={() => isMobile && toggleMenu()}
                    >
                      <FaClipboardList className={`w-4 h-4 min-w-[16px] ${isActive('/inventory') ? 'text-primary' : ''}`} />
                      <span>재고 목록</span>
                    </Link>
                    <Link
                      href="/codes"
                      className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/codes') ? 'bg-base-300' : ''}`}
                      onClick={() => isMobile && toggleMenu()}
                    >
                      <FaList className={`w-4 h-4 min-w-[16px] ${isActive('/codes') ? 'text-primary' : ''}`} />
                      <span>코드 관리</span>
                    </Link>
                    <Link
                      href="/sites"
                      className={`flex items-center gap-2 p-2 hover:bg-base-300 rounded-lg text-sm ${isActive('/sites') ? 'bg-base-300' : ''}`}
                      onClick={() => isMobile && toggleMenu()}
                    >
                      <FaStore className={`w-4 h-4 min-w-[16px] ${isActive('/sites') ? 'text-primary' : ''}`} />
                      <span>사이트 관리</span>
                    </Link>
                  </div>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>
    </aside>
  )
} 