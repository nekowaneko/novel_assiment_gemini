// Tiptap 富文本編輯器主元件
// A4 紙張風格、中文排版、即時格式化、文字選取浮動按鈕

'use client'

import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Box, Paper } from '@mui/material'
import EditorToolbar from './EditorToolbar'
import SelectionPopup from './SelectionPopup'
import './Editor.css'

interface EditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
}

const Editor = ({ 
  content = '', 
  onChange, 
  placeholder = '開始寫作...' 
}: EditorProps) => {
  // 追蹤是否為外部更新，避免迴圈
  const isExternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    immediatelyRender: false, // 避免 SSR hydration 不匹配
    onUpdate: ({ editor }) => {
      // 只有在非外部更新時才觸發 onChange
      if (!isExternalUpdate.current) {
        onChange?.(editor.getHTML())
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  })

  // 當 content prop 變更時，同步到編輯器
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML()
      // 只有當內容真正不同時才更新，避免無限迴圈
      if (currentContent !== content) {
        isExternalUpdate.current = true
        editor.commands.setContent(content, { emitUpdate: false })
        isExternalUpdate.current = false
      }
    }
  }, [editor, content])

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        p: 4,
        minHeight: 'calc(100vh - 88px)',
        bgcolor: 'background.default',
      }}
    >
      {/* A4 紙張風格容器 */}
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 800,          // 模擬 A4 寬度
          minHeight: 1000,        // 模擬 A4 高度
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* 工具列 */}
        <EditorToolbar editor={editor} />
        
        {/* 編輯區 */}
        <Box
          sx={{
            p: '2.54cm',          // A4 頁邊距
            minHeight: 900,
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Paper>
      
      {/* 文字選取浮動按鈕 */}
      <SelectionPopup editor={editor} />
    </Box>
  )
}

export default Editor
