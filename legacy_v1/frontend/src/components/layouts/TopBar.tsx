// 頂部導航列元件
// 包含檔案資訊、字數統計、側邊欄開關、AI 模式切換、新手教學
// 支援上傳 .docx 與匯出功能

'use client'

import { useRef, useState } from 'react'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Tabs, 
  Tab,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import EditNoteIcon from '@mui/icons-material/EditNote'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import SettingsIcon from '@mui/icons-material/Settings'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import CloseIcon from '@mui/icons-material/Close'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useUIStore, useEditorStore } from '@/stores'
import { uploadDocx, exportDocx } from '@/services/aiService'

interface TopBarProps {
  onOpenTutorial?: () => void
}

const TopBar = ({ onOpenTutorial }: TopBarProps) => {
  const { 
    tabs, 
    activeTabId, 
    setActiveTab, 
    closeTab,
    toggleKnowledgeSidebar,
    toggleAISidebar,
    isAISidebarOpen,
    activeAIMode,
    setAIMode,
    openTab,
  } = useUIStore()
  
  const { wordCount, addDocument } = useEditorStore()
  
  // 檔案選單狀態
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 通知狀態
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue)
    // 同步 editorStore 的 activeDocumentId
    useEditorStore.getState().setActiveDocument(newValue)
  }

  const handleAIButtonClick = (mode: 'screenwriter' | 'reader') => {
    if (isAISidebarOpen && activeAIMode === mode) {
      toggleAISidebar()
    } else {
      setAIMode(mode)
      if (!isAISidebarOpen) {
        toggleAISidebar()
      }
    }
  }
  
  // 處理上傳 .docx - 新增為新文件
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    try {
      const result = await uploadDocx(file)
      
      // 產生唯一 ID (使用時間戳)
      const docId = `chapter_${Date.now()}`
      
      // 移除 .docx 副檔名作為標題
      const title = result.filename.replace(/\.docx$/i, '')
      
      // 將純文字轉換為 HTML 段落
      const htmlContent = result.content
        .split('\n')
        .filter(line => line.trim())
        .map(line => `<p>${line}</p>`)
        .join('')
      
      // 新增文件到 editorStore
      addDocument({
        id: docId,
        title,
        content: htmlContent || `<p>${result.content}</p>`,
        type: 'chapter',
      })
      
      // 新增分頁到 uiStore
      openTab({
        id: docId,
        title,
        type: 'chapter',
      })
      
      setSnackbar({ 
        open: true, 
        message: `已載入「${title}」(${result.characterCount} 字)`, 
        severity: 'success' 
      })
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : '上傳失敗', 
        severity: 'error' 
      })
    }
    
    // 清除檔案輸入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setMenuAnchor(null)
  }
  
  // 處理匯出 .docx
  const handleExport = async () => {
    const { getActiveDocument } = useEditorStore.getState()
    const doc = getActiveDocument()
    
    if (!doc?.content) {
      setSnackbar({ open: true, message: '沒有內容可匯出', severity: 'error' })
      return
    }
    
    try {
      const blob = await exportDocx(doc.content, `${doc.title || '我的小說'}.docx`)
      
      // 建立下載連結
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title || '我的小說'}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSnackbar({ open: true, message: '匯出成功', severity: 'success' })
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : '匯出失敗', 
        severity: 'error' 
      })
    }
    setMenuAnchor(null)
  }

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar variant="dense">
          {/* 左側：側邊欄開關與檔案資訊 */}
          <IconButton 
            edge="start" 
            onClick={toggleKnowledgeSidebar}
            sx={{ mr: 1 }}
            data-tutorial="menu-button"
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            AI 寫作伴侶
          </Typography>
          
          <Chip 
            label={`${wordCount.toLocaleString()} 字`}
            size="small" 
            variant="outlined" 
            sx={{ ml: 2 }}
          />
          
          {/* 中間空白 */}
          <Box sx={{ flexGrow: 1 }} />
          
          {/* 右側：功能按鈕 */}
          <Tooltip title="新手教學">
            <IconButton onClick={onOpenTutorial} data-tutorial="help-button">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          
          {/* 檔案功能選單 */}
          <Tooltip title="檔案">
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={() => fileInputRef.current?.click()}>
              <ListItemIcon><FileUploadIcon fontSize="small" /></ListItemIcon>
              <ListItemText>上傳小說章節 (.docx)</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleExport}>
              <ListItemIcon><FileDownloadIcon fontSize="small" /></ListItemIcon>
              <ListItemText>匯出為 .docx</ListItemText>
            </MenuItem>
          </Menu>
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".docx"
            onChange={handleUpload}
          />
          
          <Tooltip title="設定">
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Box sx={{ mx: 1, borderLeft: 1, borderColor: 'divider', height: 24 }} />
          
          {/* AI 模式切換 */}
          <Tooltip title="編劇 AI">
            <IconButton 
              onClick={() => handleAIButtonClick('screenwriter')}
              color={isAISidebarOpen && activeAIMode === 'screenwriter' ? 'primary' : 'default'}
              data-tutorial="screenwriter-button"
            >
              <EditNoteIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="讀者 AI">
            <IconButton 
              onClick={() => handleAIButtonClick('reader')}
              color={isAISidebarOpen && activeAIMode === 'reader' ? 'primary' : 'default'}
              data-tutorial="reader-button"
            >
              <AutoStoriesIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        
        {/* 分頁標籤列 */}
        <Box 
          sx={{ bgcolor: 'grey.100', borderTop: 1, borderColor: 'divider' }}
          data-tutorial="tabs"
        >
          <Tabs 
            value={activeTabId} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 36 }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{tab.title}</span>
                    {tabs.length > 1 && (
                      <CloseIcon 
                        sx={{ fontSize: 14 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTab(tab.id)
                        }}
                      />
                    )}
                  </Box>
                }
                sx={{ 
                  minHeight: 36, 
                  py: 0.5,
                  textTransform: 'none',
                }}
              />
            ))}
          </Tabs>
        </Box>
      </AppBar>
      
      {/* 通知訊息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default TopBar
