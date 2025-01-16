'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition, Disclosure } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ShoppingCartIcon,
  CalculatorIcon,
  CubeIcon,
  Cog6ToothIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navigation = [
  { name: '대시보드', href: '/', icon: HomeIcon },
  { name: '주문 관리', href: '/orders', icon: ShoppingCartIcon },
  { name: '정산 관리', href: '/settlements', icon: CalculatorIcon },
  { 
    name: '재고 관리', 
    href: '/inventory', 
    icon: CubeIcon,
    subItems: [
      { name: '재고 리스트', href: '/inventory' },
      { name: '코드 관리', href: '/codes' },
      { name: '재고 알림', href: '/inventory/alerts' },
    ]
  },
  { name: '설정', href: '/settings', icon: Cog6ToothIcon },
]

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const isActiveRoute = (href) => {
    if (href === '/') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const renderNavItem = (item) => {
    if (item.subItems) {
      return (
        <Disclosure key={item.name} defaultOpen={isActiveRoute(item.href)}>
          {({ open }) => (
            <div>
              <Disclosure.Button
                className={clsx(
                  isActiveRoute(item.href)
                    ? 'bg-gray-50 text-primary'
                    : 'text-gray-700 hover:text-primary hover:bg-gray-50',
                  'group flex items-center w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                )}
              >
                <item.icon
                  className={clsx(
                    isActiveRoute(item.href) ? 'text-primary' : 'text-gray-400 group-hover:text-primary',
                    'h-6 w-6 shrink-0'
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && (
                  <>
                    {item.name}
                    <ChevronDownIcon
                      className={clsx(
                        open ? 'rotate-180' : '',
                        'ml-auto h-5 w-5 transition-transform duration-200'
                      )}
                    />
                  </>
                )}
              </Disclosure.Button>
              <Disclosure.Panel className="ml-6 mt-1 space-y-1">
                {!isCollapsed && item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={clsx(
                      pathname === subItem.href
                        ? 'bg-gray-50 text-primary'
                        : 'text-gray-700 hover:text-primary hover:bg-gray-50',
                      'block rounded-md py-2 pl-9 pr-2 text-sm leading-6'
                    )}
                  >
                    {subItem.name}
                  </Link>
                ))}
              </Disclosure.Panel>
            </div>
          )}
        </Disclosure>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={clsx(
          isActiveRoute(item.href)
            ? 'bg-gray-50 text-primary'
            : 'text-gray-700 hover:text-primary hover:bg-gray-50',
          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
          isCollapsed && 'justify-center'
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <item.icon
          className={clsx(
            isActiveRoute(item.href) ? 'text-primary' : 'text-gray-400 group-hover:text-primary',
            'h-6 w-6 shrink-0'
          )}
          aria-hidden="true"
        />
        {!isCollapsed && item.name}
      </Link>
    )
  }

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center">
                      <span className="text-2xl font-bold text-gray-900">Order Dash</span>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => (
                              <li key={item.name}>{renderNavItem(item)}</li>
                            ))}
                          </ul>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className={clsx(
          'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col',
          isCollapsed ? 'lg:w-20' : 'lg:w-72',
          'transition-all duration-300'
        )}>
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center justify-between">
              {!isCollapsed && <span className="text-2xl font-bold text-gray-900">Order Dash</span>}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="rounded-lg p-1.5 hover:bg-gray-100"
              >
                {isCollapsed ? (
                  <ChevronDoubleRightIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDoubleLeftIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>{renderNavItem(item)}</li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className={clsx(
          'lg:pl-72 transition-all duration-300',
          isCollapsed && 'lg:pl-20'
        )}>
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
} 