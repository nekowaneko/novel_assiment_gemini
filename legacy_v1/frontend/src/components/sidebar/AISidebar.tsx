// 右側 AI 助手側邊欄元件
// 整合 Mock API 與 Zustand 聊天狀態

'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  Drawer, 
  Box, 
  Typography, 
  TextField, 
  IconButton,
  List,
  ListItem,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import EditNoteIcon from '@mui/icons-material/EditNote'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useUIStore, useChatStore } from '@/stores'

const DRAWER_WIDTH = 360

const AISidebar = () => {
  const { isAISidebarOpen, activeAIMode, setAIMode } = useUIStore()
  const { 
    messages, 
    isLoading, 
    knowledgeBases, 
    selectedKnowledgeBases,
    sendMessage, 
    loadKnowledgeBases,
    setSelectedKnowledgeBases,
    clearMessages,
  } = useChatStore()
  
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 載入知識庫列表
  useEffect(() => {
    loadKnowledgeBases()
  }, [loadKnowledgeBases])

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const currentMessages = messages[activeAIMode]

  const modeConfig = {
    screenwriter: {
      title: '編劇 AI',
      icon: <EditNoteIcon />,
      color: 'primary' as const,
      placeholder: '討論劇情發展、角色動機...',
    },
    reader: {
      title: '讀者 AI',
      icon: <AutoStoriesIcon />,
      color: 'secondary' as const,
      placeholder: '分析閱讀體驗、情緒節奏...',
    },
  }

  const config = modeConfig[activeAIMode]

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    
    const message = inputValue
    setInputValue('')
    await sendMessage(message, activeAIMode)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearMessages = () => {
    clearMessages(activeAIMode)
  }

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={isAISidebarOpen}
      sx={{
        width: isAISidebarOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: 88,
          height: 'calc(100% - 88px)',
        },
      }}
    >
      {/* 標題列 */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color: `${config.color}.main` }}>
          {config.icon}
        </Box>
        <Typography variant="subtitle1" fontWeight={600}>
          {config.title}
        </Typography>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {/* 清除對話 */}
        <IconButton 
          size="small" 
          onClick={handleClearMessages}
          disabled={currentMessages.length === 0}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
        
        {/* 模式切換 */}
        <Chip
          label="編劇"
          size="small"
          variant={activeAIMode === 'screenwriter' ? 'filled' : 'outlined'}
          color="primary"
          onClick={() => setAIMode('screenwriter')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          label="讀者"
          size="small"
          variant={activeAIMode === 'reader' ? 'filled' : 'outlined'}
          color="secondary"
          onClick={() => setAIMode('reader')}
          sx={{ cursor: 'pointer' }}
        />
      </Box>

      <Divider />

      {/* 知識庫選擇器 (僅編劇模式) */}
      {activeAIMode === 'screenwriter' && (
        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
          <FormControl fullWidth size="small">
            <InputLabel>參考知識庫</InputLabel>
            <Select
              multiple
              value={selectedKnowledgeBases}
              onChange={(e) => setSelectedKnowledgeBases(e.target.value as string[])}
              label="參考知識庫"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const kb = knowledgeBases.find((k) => k.id === value)
                    return <Chip key={value} label={kb?.name || value} size="small" />
                  })}
                </Box>
              )}
            >
              {knowledgeBases.map((kb) => (
                <MenuItem key={kb.id} value={kb.id}>
                  {kb.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* 章節選擇器 (僅讀者模式) */}
      {activeAIMode === 'reader' && (
        <Box sx={{ p: 2, bgcolor: 'secondary.50' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            💡 選取編輯器中的文字，或選擇章節進行分析
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>選擇章節分析</InputLabel>
            <Select
              value=""
              label="選擇章節分析"
              onChange={(e) => {
                const chapterName = e.target.value as string
                if (chapterName) {
                  // 發送章節分析請求
                  sendMessage(`請分析「${chapterName}」這一章的閱讀體驗`, 'reader')
                }
              }}
            >
              <MenuItem value="第一章：序幕">第一章：序幕</MenuItem>
              <MenuItem value="第二章：相遇">第二章：相遇</MenuItem>
              <MenuItem value="第三章：轉折">第三章：轉折</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* 訊息列表 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {currentMessages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'text.secondary',
          }}>
            <Typography variant="body2">
              {activeAIMode === 'screenwriter' 
                ? '詢問劇情發展、角色設計...' 
                : '分析文字、評估閱讀體驗...'}
            </Typography>
          </Box>
        ) : (
          <List>
            {currentMessages.map((msg) => (
              <ListItem 
                key={msg.id} 
                sx={{ 
                  flexDirection: 'column', 
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  px: 0,
                  py: 0.5,
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '90%',
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                    color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                </Paper>
              </ListItem>
            ))}
            {isLoading && (
              <ListItem sx={{ justifyContent: 'flex-start', px: 0 }}>
                <Paper sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      思考中...
                    </Typography>
                  </Box>
                </Paper>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      {/* 輸入區 */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder={config.placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <IconButton 
            color={config.color} 
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  )
}

export default AISidebar
