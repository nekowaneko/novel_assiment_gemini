// 主佈局元件
// 三欄式佈局：左側知識庫 + 中央編輯畫布 + 右側 AI 助手 + 新手教學

'use client'

import { useState } from 'react'
import { Box } from '@mui/material'
import { useUIStore } from '@/stores'
import TopBar from './TopBar'
import KnowledgeSidebar from '../sidebar/KnowledgeSidebar'
import AISidebar from '../sidebar/AISidebar'
import { TutorialGuide } from '../ui'

interface MainLayoutProps {
  children: React.ReactNode
}

const LEFT_DRAWER_WIDTH = 260
const RIGHT_DRAWER_WIDTH = 360
const TOPBAR_HEIGHT = 88

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isKnowledgeSidebarOpen, isAISidebarOpen } = useUIStore()
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  // 計算中央內容區的左右邊距
  const marginLeft = isKnowledgeSidebarOpen ? LEFT_DRAWER_WIDTH : 0
  const marginRight = isAISidebarOpen ? RIGHT_DRAWER_WIDTH : 0

  const handleOpenTutorial = () => setIsTutorialOpen(true)
  const handleCloseTutorial = () => setIsTutorialOpen(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 頂部導航列 */}
      <TopBar onOpenTutorial={handleOpenTutorial} />
      
      {/* 左側知識庫側邊欄 */}
      <KnowledgeSidebar />
      
      {/* 中央內容區 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: `${TOPBAR_HEIGHT}px`,
          ml: `${marginLeft}px`,
          mr: `${marginRight}px`,
          transition: (theme) =>
            theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
      
      {/* 右側 AI 助手面板 */}
      <AISidebar />
      
      {/* 新手教學導覽 */}
      <TutorialGuide isOpen={isTutorialOpen} onClose={handleCloseTutorial} />
    </Box>
  )
}

export default MainLayout
