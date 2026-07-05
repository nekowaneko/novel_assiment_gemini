// Tiptap 編輯器工具列元件
// 提供格式化按鈕 (粗體、斜體、標題等)

'use client'

import { Box, IconButton, Divider, Tooltip } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough'
import TitleIcon from '@mui/icons-material/Title'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import type { Editor } from '@tiptap/react'

// 工具按鈕 Props 類型
interface ToolButtonProps {
  onClick: () => void
  isActive?: boolean
  icon: React.ReactNode
  tooltip: string
}

// 工具按鈕元件 (定義在元件外部避免重複建立)
const ToolButton = ({ onClick, isActive, icon, tooltip }: ToolButtonProps) => (
  <Tooltip title={tooltip} arrow>
    <IconButton
      size="small"
      onClick={onClick}
      sx={{
        color: isActive ? 'primary.main' : 'text.secondary',
        bgcolor: isActive ? 'primary.light' : 'transparent',
        '&:hover': { bgcolor: 'grey.200' },
      }}
    >
      {icon}
    </IconButton>
  </Tooltip>
)

interface EditorToolbarProps {
  editor: Editor | null
}

const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  if (!editor) return null

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        p: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
        flexWrap: 'wrap',
      }}
    >
      {/* 復原/重做 */}
      <ToolButton
        onClick={() => editor.chain().focus().undo().run()}
        icon={<UndoIcon fontSize="small" />}
        tooltip="復原 (Ctrl+Z)"
      />
      <ToolButton
        onClick={() => editor.chain().focus().redo().run()}
        icon={<RedoIcon fontSize="small" />}
        tooltip="重做 (Ctrl+Y)"
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* 文字格式 */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={<FormatBoldIcon fontSize="small" />}
        tooltip="粗體 (Ctrl+B)"
      />
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={<FormatItalicIcon fontSize="small" />}
        tooltip="斜體 (Ctrl+I)"
      />
      <ToolButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={<FormatStrikethroughIcon fontSize="small" />}
        tooltip="刪除線"
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* 標題 */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={<TitleIcon fontSize="small" />}
        tooltip="標題 1"
      />
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={<TitleIcon sx={{ fontSize: 16 }} />}
        tooltip="標題 2"
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* 區塊格式 */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={<FormatQuoteIcon fontSize="small" />}
        tooltip="引用"
      />
      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={<FormatListBulletedIcon fontSize="small" />}
        tooltip="項目符號清單"
      />
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={<FormatListNumberedIcon fontSize="small" />}
        tooltip="編號清單"
      />
    </Box>
  )
}

export default EditorToolbar
