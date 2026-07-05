// 文字選取浮動按鈕元件
// 當使用者在編輯器中選取文字時，顯示「讀者評價」按鈕

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Fab, Tooltip, Zoom } from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import type { Editor } from '@tiptap/react'
import { useUIStore, useChatStore } from '@/stores'

interface SelectionPopupProps {
  editor: Editor | null
}

interface PopupPosition {
  x: number
  y: number
}

const SelectionPopup = ({ editor }: SelectionPopupProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<PopupPosition>({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  
  const { setAIMode, toggleAISidebar, isAISidebarOpen } = useUIStore()
  const { analyzeText } = useChatStore()

  // 處理選取變化
  const handleSelectionChange = useCallback(() => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')

    if (text.length > 5) {
      // 取得選取範圍的座標
      const domSelection = window.getSelection()
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        })
        setSelectedText(text)
        setIsVisible(true)
      }
    } else {
      setIsVisible(false)
      setSelectedText('')
    }
  }, [editor])

  // 監聽編輯器選取事件
  useEffect(() => {
    if (!editor) return

    editor.on('selectionUpdate', handleSelectionChange)
    
    return () => {
      editor.off('selectionUpdate', handleSelectionChange)
    }
  }, [editor, handleSelectionChange])

  // 點擊文件其他地方時隱藏
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.selection-popup-fab')) {
        // 延遲隱藏，避免點擊按鈕時立即消失
        setTimeout(() => {
          if (window.getSelection()?.toString().length === 0) {
            setIsVisible(false)
          }
        }, 100)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 處理讀者評價點擊
  const handleAnalyzeClick = async () => {
    if (!selectedText) return
    
    // 開啟讀者 AI 面板
    setAIMode('reader')
    if (!isAISidebarOpen) {
      toggleAISidebar()
    }
    
    // 發送文字分析請求
    await analyzeText(selectedText)
    
    // 隱藏浮動按鈕
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <Zoom in={isVisible}>
      <Tooltip title={`分析選取文字 (${selectedText.length} 字)`} arrow placement="top">
        <Fab
          size="small"
          color="secondary"
          className="selection-popup-fab"
          onClick={handleAnalyzeClick}
          sx={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 1300,
            boxShadow: 3,
          }}
        >
          <AutoStoriesIcon fontSize="small" />
        </Fab>
      </Tooltip>
    </Zoom>
  )
}

export default SelectionPopup
