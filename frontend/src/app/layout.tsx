// AI 寫作伴侶 - 根佈局
// 整合 MUI 主題與繁體中文語言設定

import type { Metadata } from 'next'
import { ThemeRegistry } from '@/components'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 寫作伴侶',
  description: '具備富文本編輯器與 AI 助手的沉浸式寫作環境',
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => (
  <html lang="zh-TW">
    <body>
      <ThemeRegistry>{children}</ThemeRegistry>
    </body>
  </html>
)

export default RootLayout
