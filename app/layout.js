import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Order Dashboard',
  description: '주문 관리 대시보드',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
