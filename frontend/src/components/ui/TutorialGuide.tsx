// 新手教學步驟式導覽元件
// 無遮罩版本，使用醒目提示框與箭頭指示

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Fade,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp'
import MenuIcon from '@mui/icons-material/Menu'
import EditNoteIcon from '@mui/icons-material/EditNote'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import TabIcon from '@mui/icons-material/Tab'
import { useUIStore } from '@/stores'

// 教學步驟定義
interface TutorialStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  targetSelector?: string
  cardPosition: 'center' | 'bottom-left' | 'bottom-right' | 'bottom-center'
  showArrow?: 'up' | 'none'  // 箭頭指示方向
}

interface TutorialGuideProps {
  isOpen: boolean
  onClose: () => void
}

const TutorialGuide = ({ isOpen, onClose }: TutorialGuideProps) => {
  const [activeStep, setActiveStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const executedStepsRef = useRef<Set<number>>(new Set())
  
  const { 
    toggleKnowledgeSidebar, 
    toggleAISidebar, 
    setAIMode,
    isKnowledgeSidebarOpen,
    isAISidebarOpen,
  } = useUIStore()

  // 教學步驟內容
  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: '歡迎使用 AI 寫作伴侶！',
      description: '這是一個為小說創作者設計的沉浸式寫作環境。讓我們快速了解各項功能。',
      icon: <EditNoteIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      cardPosition: 'center',
    },
    {
      id: 'knowledge-sidebar',
      title: '知識庫側邊欄',
      description: '點擊左上角的選單圖示，可以開啟知識庫側邊欄。這裡存放您的小說章節與設定資料（世界觀、角色小傳等）。',
      icon: <MenuIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      targetSelector: '[data-tutorial="menu-button"]',
      cardPosition: 'bottom-left',
    },
    {
      id: 'screenwriter-ai',
      title: '編劇 AI - 宏觀策劃',
      description: '當您卡關時，點擊編劇 AI 圖示來討論劇情發展。您可以選擇參考的知識庫，讓 AI 根據您的設定給出建議。',
      icon: <EditNoteIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      targetSelector: '[data-tutorial="screenwriter-button"]',
      cardPosition: 'bottom-right',
    },
    {
      id: 'reader-ai',
      title: '讀者 AI - 微觀審閱',
      description: '寫完一段後，可以選取文字並點擊浮現的評價按鈕，或直接選擇章節進行分析。讀者 AI 會給出情緒分析與改進建議。',
      icon: <AutoStoriesIcon sx={{ fontSize: 48, color: 'secondary.main' }} />,
      targetSelector: '[data-tutorial="reader-button"]',
      cardPosition: 'bottom-right',
    },
    {
      id: 'editor-toolbar',
      title: '編輯器工具列',
      description: '工具列提供常用的格式化功能：粗體、斜體、標題、引用、清單等。支援快捷鍵操作 (Ctrl+B, Ctrl+I)。',
      icon: <FormatBoldIcon sx={{ fontSize: 48, color: 'text.secondary' }} />,
      cardPosition: 'bottom-center',
      showArrow: 'up',  // 使用向上箭頭指示
    },
    {
      id: 'tabs',
      title: '多分頁編輯',
      description: '您可以同時開啟多個文件（章節或設定），像瀏覽器分頁一樣快速切換，不需離開編輯環境。',
      icon: <TabIcon sx={{ fontSize: 48, color: 'text.secondary' }} />,
      targetSelector: '[data-tutorial="tabs"]',
      cardPosition: 'bottom-center',
    },
    {
      id: 'complete',
      title: '開始創作吧！',
      description: '您已了解所有核心功能。隨時可以點擊右上角的「?」按鈕重新觀看教學。祝創作愉快！',
      icon: <EditNoteIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      cardPosition: 'center',
    },
  ]

  const currentStep = steps[activeStep]

  // 執行步驟對應的動作 (只執行一次)
  const executeStepAction = useCallback((stepIndex: number) => {
    if (executedStepsRef.current.has(stepIndex)) return
    executedStepsRef.current.add(stepIndex)

    switch (stepIndex) {
      case 1: // 知識庫側邊欄
        if (!isKnowledgeSidebarOpen) toggleKnowledgeSidebar()
        break
      case 2: // 編劇 AI
        if (isKnowledgeSidebarOpen) toggleKnowledgeSidebar()
        setAIMode('screenwriter')
        if (!isAISidebarOpen) toggleAISidebar()
        break
      case 3: // 讀者 AI
        setAIMode('reader')
        break
      case 4: // 編輯器工具列
        if (isAISidebarOpen) toggleAISidebar()
        break
    }
  }, [isKnowledgeSidebarOpen, isAISidebarOpen, toggleKnowledgeSidebar, toggleAISidebar, setAIMode])

  // 高亮目標元素
  useEffect(() => {
    if (!isOpen) return

    // 執行步驟動作
    executeStepAction(activeStep)

    if (!currentStep.targetSelector) {
      setHighlightRect(null)
      return
    }

    const updateHighlight = () => {
      const element = document.querySelector(currentStep.targetSelector!)
      if (element) {
        setHighlightRect(element.getBoundingClientRect())
      }
    }
    
    // 延遲取得位置（等待動畫完成）
    const timer = setTimeout(updateHighlight, 350)
    
    return () => clearTimeout(timer)
  }, [isOpen, activeStep, currentStep.targetSelector, executeStepAction])

  // 重置狀態
  useEffect(() => {
    if (!isOpen) {
      setActiveStep(0)
      setHighlightRect(null)
      executedStepsRef.current.clear()
    }
  }, [isOpen])

  const handleNext = useCallback(() => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1)
    } else {
      onClose()
    }
  }, [activeStep, steps.length, onClose])

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      executedStepsRef.current.delete(activeStep - 1)
      setActiveStep((prev) => prev - 1)
    }
  }, [activeStep])

  const handleSkip = useCallback(() => {
    if (isKnowledgeSidebarOpen) toggleKnowledgeSidebar()
    if (isAISidebarOpen) toggleAISidebar()
    onClose()
  }, [onClose, isKnowledgeSidebarOpen, isAISidebarOpen, toggleKnowledgeSidebar, toggleAISidebar])

  if (!isOpen) return null

  // 計算卡片位置
  const getCardPosition = (): React.CSSProperties => {
    switch (currentStep.cardPosition) {
      case 'bottom-left':
        return { bottom: 40, left: 40 }
      case 'bottom-right':
        return { bottom: 40, right: 40 }
      case 'bottom-center':
        return { bottom: 40, left: '50%', transform: 'translateX(-50%)' }
      case 'center':
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
  }

  return (
    <>
      {/* 高亮框 (無遮罩，僅醒目提示) */}
      {highlightRect && (
        <Box
          sx={{
            position: 'fixed',
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            border: '4px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            zIndex: 1500,
            pointerEvents: 'none',
            boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.15), 0 0 30px rgba(26, 35, 126, 0.6)',
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%, 100%': { boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.15), 0 0 20px rgba(26, 35, 126, 0.4)' },
              '50%': { boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.15), 0 0 40px rgba(26, 35, 126, 0.8)' },
            },
          }}
        />
      )}

      {/* 箭頭指示 (用於編輯器工具列等沒有特定按鈕的步驟) */}
      {currentStep.showArrow === 'up' && (
        <Box
          sx={{
            position: 'fixed',
            top: 140,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'bounce 1s infinite',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
              '50%': { transform: 'translateX(-50%) translateY(-10px)' },
            },
          }}
        >
          <KeyboardDoubleArrowUpIcon 
            sx={{ 
              fontSize: 60, 
              color: 'primary.main',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }} 
          />
          <Typography 
            variant="body2" 
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white', 
              px: 2, 
              py: 0.5, 
              borderRadius: 1,
              fontWeight: 600,
            }}
          >
            工具列在這裡
          </Typography>
        </Box>
      )}

      {/* 教學卡片 */}
      <Fade in={isOpen}>
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            ...getCardPosition(),
            zIndex: 1501,
            width: 420,
            maxWidth: '90vw',
            p: 3,
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
          }}
        >
          {/* 關閉按鈕 */}
          <IconButton
            size="small"
            onClick={handleSkip}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {/* 圖示與標題 */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            {currentStep.icon}
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
              {currentStep.title}
            </Typography>
          </Box>

          {/* 說明文字 */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', lineHeight: 1.8 }}>
            {currentStep.description}
          </Typography>

          {/* 步驟指示器 */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
            {steps.map((step) => (
              <Step key={step.id}>
                <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 10 } }} />
              </Step>
            ))}
          </Stepper>

          {/* 操作按鈕 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              上一步
            </Button>
            
            <Button variant="text" onClick={handleSkip}>
              跳過教學
            </Button>
            
            <Button
              variant="contained"
              endIcon={activeStep < steps.length - 1 ? <ArrowForwardIcon /> : null}
              onClick={handleNext}
            >
              {activeStep < steps.length - 1 ? '下一步' : '完成'}
            </Button>
          </Box>
        </Paper>
      </Fade>
    </>
  )
}

export default TutorialGuide
