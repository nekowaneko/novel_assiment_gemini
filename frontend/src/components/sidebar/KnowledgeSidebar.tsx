// 左側知識庫側邊欄元件
// 顯示專案檔案樹狀圖 (小說章節、知識庫文件)
// 支援從後端載入知識庫與上傳新知識庫

'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Drawer, 
  Box, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import DescriptionIcon from '@mui/icons-material/Description'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useUIStore, useEditorStore } from '@/stores'
import { getKnowledgeBases, createKnowledgeBase, KnowledgeBase } from '@/services/aiService'

const DRAWER_WIDTH = 260

const KnowledgeSidebar = () => {
  const { isKnowledgeSidebarOpen, openTab } = useUIStore()
  const { getChapters, setActiveDocument } = useEditorStore()
  const [chaptersOpen, setChaptersOpen] = useState(true)
  const [knowledgeOpen, setKnowledgeOpen] = useState(true)

  // 從 editorStore 取得章節列表
  const chapters = getChapters()

  // 知識庫狀態
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 上傳對話框狀態
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [newKbName, setNewKbName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 載入知識庫列表
  const loadKnowledgeBases = async () => {
    setIsLoading(true)
    try {
      const kbs = await getKnowledgeBases()
      setKnowledgeBases(kbs)
    } catch (error) {
      console.error('載入知識庫失敗:', error)
    }
    setIsLoading(false)
  }

  // 初始載入 - 元件掛載時載入一次
  useEffect(() => {
    loadKnowledgeBases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileClick = (id: string, title: string, type: 'chapter' | 'knowledge') => {
    openTab({ id, title, type })
  }

  // 處理檔案選擇
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setSelectedFiles(Array.from(files))
    }
  }

  // 移除選擇的檔案
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 上傳知識庫
  const handleUpload = async () => {
    if (!newKbName.trim()) {
      setUploadError('請輸入知識庫名稱')
      return
    }
    if (selectedFiles.length === 0) {
      setUploadError('請選擇至少一個檔案')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      const result = await createKnowledgeBase(newKbName.trim(), selectedFiles)
      if (result.success) {
        setUploadSuccess(result.message)
        setNewKbName('')
        setSelectedFiles([])
        // 重新載入知識庫列表
        await loadKnowledgeBases()
        // 延遲關閉對話框
        setTimeout(() => {
          setUploadDialogOpen(false)
          setUploadSuccess('')
        }, 1500)
      } else {
        setUploadError(result.message)
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '上傳失敗')
    } finally {
      setIsUploading(false)
    }
  }

  // 關閉對話框
  const handleCloseDialog = () => {
    setUploadDialogOpen(false)
    setNewKbName('')
    setSelectedFiles([])
    setUploadError('')
    setUploadSuccess('')
  }

  return (
    <>
      <Drawer
        variant="persistent"
        anchor="left"
        open={isKnowledgeSidebarOpen}
        sx={{
          width: isKnowledgeSidebarOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: 88,
            height: 'calc(100% - 88px)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              專案檔案
            </Typography>
            <Box>
              <IconButton size="small" onClick={loadKnowledgeBases} title="重新載入">
                <RefreshIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setUploadDialogOpen(true)} title="上傳知識庫">
                <UploadFileIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Divider />

        <List dense>
          {/* 小說章節 */}
          <ListItemButton onClick={() => setChaptersOpen(!chaptersOpen)}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <FolderIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="小說章節" />
            {chaptersOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={chaptersOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {chapters.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ pl: 4, py: 1 }}>
                  尚無章節
                </Typography>
              ) : (
                chapters.map((chapter) => (
                  <ListItemButton 
                    key={chapter.id} 
                    sx={{ pl: 4 }}
                    onClick={() => handleFileClick(chapter.id, chapter.title, 'chapter')}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <DescriptionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={chapter.title} 
                      primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          </Collapse>

          {/* 知識庫 */}
          <ListItemButton onClick={() => setKnowledgeOpen(!knowledgeOpen)}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <FolderIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText primary="知識庫" />
            {isLoading ? (
              <CircularProgress size={16} />
            ) : (
              knowledgeOpen ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
          <Collapse in={knowledgeOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* 新增知識庫按鈕 - 更明顯 */}
              <ListItemButton 
                sx={{ pl: 4, bgcolor: 'action.hover' }}
                onClick={() => setUploadDialogOpen(true)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <AddIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="新增知識庫" 
                  primaryTypographyProps={{ fontSize: 14, color: 'primary.main' }}
                />
              </ListItemButton>
              
              {knowledgeBases.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ pl: 4, py: 1 }}>
                  尚無知識庫
                </Typography>
              ) : (
                knowledgeBases.map((kb) => (
                  <ListItemButton 
                    key={kb.id} 
                    sx={{ pl: 4 }}
                    onClick={() => handleFileClick(kb.id, kb.name, 'knowledge')}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <DescriptionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={kb.name}
                      primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          </Collapse>
        </List>
      </Drawer>

      {/* 上傳知識庫對話框 */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>建立新知識庫</DialogTitle>
        <DialogContent>
          {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
          {uploadSuccess && <Alert severity="success" sx={{ mb: 2 }}>{uploadSuccess}</Alert>}
          
          <TextField
            label="知識庫名稱"
            fullWidth
            value={newKbName}
            onChange={(e) => setNewKbName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            placeholder="例如：世界觀設定"
          />

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".docx,.txt"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            fullWidth
            sx={{ mb: 2 }}
          >
            選擇檔案 (.docx, .txt)
          </Button>

          {selectedFiles.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedFiles.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => handleRemoveFile(index)}
                  size="small"
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isUploading}>
            取消
          </Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={isUploading}
            startIcon={isUploading ? <CircularProgress size={16} /> : null}
          >
            {isUploading ? '建立中...' : '建立知識庫'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default KnowledgeSidebar
