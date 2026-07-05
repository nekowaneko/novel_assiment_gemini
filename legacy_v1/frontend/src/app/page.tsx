// AI 寫作伴侶 - 首頁 (編輯工作台)
// 整合 MainLayout 與 Tiptap 編輯器

'use client'

import { MainLayout, Editor } from '@/components'
import { useEditorStore } from '@/stores'

const HomePage = () => {
  const { getActiveDocument, updateContent, activeDocumentId } = useEditorStore()
  const activeDoc = getActiveDocument()

  const handleContentChange = (content: string) => {
    if (activeDocumentId) {
      updateContent(activeDocumentId, content)
    }
  }

  return (
    <MainLayout>
      <Editor 
        content={activeDoc?.content} 
        onChange={handleContentChange}
        placeholder="開始創作你的故事..."
      />
    </MainLayout>
  )
}

export default HomePage
