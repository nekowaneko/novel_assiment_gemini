'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, X, Key, Check, AlertCircle, BookOpen, Clapperboard, Download } from 'lucide-react'

// TypeScript 型別定義 — electronAPI 由 preload.js 注入
interface ElectronAPI {
  resizeWindow: (width: number, height: number) => void
  onClipboardUpdate: (callback: (text: string) => void) => void
  analyzeText: (text: string, history?: Array<Record<string, string>>) => Promise<{ success: boolean; data?: string; error?: string }>
  onAnalyzeChunk: (callback: (chunk: string) => void) => void
  ingestText: (documents: string[]) => Promise<{ success: boolean; data?: string; error?: string }>
  readerAnalyze: (text: string) => Promise<{ success: boolean; data?: string; error?: string }>
  setApiKey: (apiKey: string) => Promise<{ success: boolean; message?: string; error?: string }>
  getApiKeyStatus: () => Promise<{ success: boolean; data?: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [clipboardText, setClipboardText] = useState('')
  const [inputText, setInputText] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isIngesting, setIsIngesting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'online' | 'offline'>('connecting')
  
  // Phase 6 New State
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSavingKey, setIsSavingKey] = useState(false)
  // 儲存失敗訊息 — 必須顯示在設定 Modal 內部
  //（statusMessage 只渲染在展開內容區，Modal 開啟時會被遮罩蓋住或根本不存在）
  const [saveKeyError, setSaveKeyError] = useState('')
  const [activeTab, setActiveTab] = useState<'writer' | 'reader'>('writer')

  const resultRef = useRef<HTMLDivElement>(null)

  // 監聽剪貼簿更新 & 編劇分析串流片段
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onClipboardUpdate((text) => setClipboardText(text))
      if (window.electronAPI.onAnalyzeChunk) {
        window.electronAPI.onAnalyzeChunk((chunk) => {
          setAnalysisResult((prev) => prev + chunk)
        })
      }
    }
  }, [])

  // 啟動時檢查 Backend 狀態 & API Key
  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const res = await window.electronAPI.getApiKeyStatus()
        if (res.success) {
          setApiKeyConfigured(!!res.data)
          if (!res.data) {
             console.log('API Key not configured, showing settings...')
             setShowSettings(true)
             // Force expand window for onboarding overlay
             if (window.electronAPI) {
               window.electronAPI.resizeWindow(440, 580)
               // Note: We keeping isExpanded false so background remains "collapsed" logically, 
               // but the window is large enough for the modal.
             }
          }
        }
      }
    }

    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8000/health')
        if (res.ok) {
          setBackendStatus('online')
          checkApiKey()
        } else {
          setBackendStatus('offline')
        }
      } catch {
        setBackendStatus('offline')
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 10000)
    return () => clearInterval(interval)
  }, [])

  // 結果區自動捲到底部
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight
    }
  }, [analysisResult])

  // 展開/收合切換
  const handleToggle = () => {
    const next = !isExpanded
    setIsExpanded(next)
    if (typeof window !== 'undefined' && window.electronAPI) {
      // If settings is open, we should probably keep it large?
      // But toggle usually means user wants to see/hide content.
      // If settings open, toggle should probably close settings or just toggle background content.
      // Let's assume toggle is for main content.
      
      const targetHeight = next ? 580 : 80
      // If settings is open, we force at least enough height for settings?
      // But user typically won't toggle when settings modal is open (overlay blocks input).
      // Wait, overlay blocks input? Yes, absolute inset-0 z-50.
      // But toggle button is in header? Header is NOT covered by overlay in my design?
      // Design: overlay is `absolute inset-0`. It covers everything relative to `relative` container.
      // The container is the `div className="w-screen h-screen ..."`.
      // So overlay covers header too.
      // So handleToggle is NOT accessible when settings is open.
      
      window.electronAPI.resizeWindow(next ? 440 : 320, targetHeight)
    }
  }

  // 使用剪貼簿內容填入輸入框
  const handleUseClipboard = () => {
    if (clipboardText) {
      setInputText(clipboardText)
      showStatus('已載入剪貼簿內容')
    }
  }

  // 設定 API Key
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setSaveKeyError('請輸入 API Key')
      return
    }
    setIsSavingKey(true)
    setSaveKeyError('')
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.setApiKey(apiKeyInput.trim())
        if (res.success) {
          setApiKeyConfigured(true)
          setShowSettings(false)
          setApiKeyInput('')
          showStatus('✅ API Key 設定成功')

          // Force UI to expanded state after save
          // User expects to use the app immediately
          setIsExpanded(true)
          window.electronAPI.resizeWindow(440, 580)
        } else {
          setSaveKeyError(`設定失敗：${res.error}`)
        }
      }
    } catch (err: any) {
      setSaveKeyError(`連線失敗：${err.message}`)
    } finally {
      setIsSavingKey(false)
    }
  }

  // 確認 API Key 狀態：本地快取為 false 時，先向 Backend 即時再確認一次。
  // 啟動後第一次狀態輪詢最多要等 10 秒，這段空窗期若直接彈設定視窗，
  // 使用者會誤以為 .env 裡的 key 不見了而重新輸入。
  const ensureApiKeyConfigured = async (): Promise<boolean> => {
    if (apiKeyConfigured) return true
    if (window.electronAPI) {
      const res = await window.electronAPI.getApiKeyStatus()
      if (res.success && !!res.data) {
        setApiKeyConfigured(true)
        return true
      }
    }
    return false
  }

  // 分析（編劇）
  const handleAnalyze = async () => {
    if (!(await ensureApiKeyConfigured())) {
      setShowSettings(true)
      // Resize for settings
      if (window.electronAPI) window.electronAPI.resizeWindow(440, 580)
      return
    }
    const textToAnalyze = inputText.trim()
    if (!textToAnalyze) {
      showStatus('請先輸入或貼上文字')
      return
    }
    setIsAnalyzing(true)
    setAnalysisResult('')
    setStatusMessage('')
    setActiveTab('writer')
    
    try {
      if (window.electronAPI) {
        // 串流進行中，onAnalyzeChunk 會逐塊填入 analysisResult；
        // Promise resolve 時以完整全文覆蓋一次，確保內容一致
        const result = await window.electronAPI.analyzeText(textToAnalyze)
        if (result.success) {
          setAnalysisResult(result.data || '（無回應內容）')
        } else {
          setAnalysisResult(`❌ 錯誤：${result.error}`)
        }
      }
    } catch (err: any) {
      setAnalysisResult(`❌ 連線失敗：${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 讀者評價 (New in Phase 6)
  const handleReaderAnalyze = async () => {
    if (!(await ensureApiKeyConfigured())) {
      setShowSettings(true)
      if (window.electronAPI) window.electronAPI.resizeWindow(440, 580)
      return
    }
    const textToAnalyze = inputText.trim()
    if (!textToAnalyze) {
      showStatus('請先輸入或貼上文字')
      return
    }
    setIsAnalyzing(true)
    setAnalysisResult('')
    setStatusMessage('')
    setActiveTab('reader')

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.readerAnalyze(textToAnalyze)
        if (result.success) {
          setAnalysisResult(result.data || '（無回應內容）')
        } else {
          setAnalysisResult(`❌ 錯誤：${result.error}`)
        }
      }
    } catch (err: any) {
      setAnalysisResult(`❌ 連線失敗：${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 匯入知識庫
  const handleIngest = async () => {
    const textToIngest = inputText.trim()
    if (!textToIngest) {
      showStatus('請先輸入或貼上文字')
      return
    }
    setIsIngesting(true)
    setStatusMessage('')
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.ingestText([textToIngest])
        if (result.success) {
          showStatus('✅ 已成功匯入知識庫')
        } else {
          showStatus(`❌ 匯入失敗：${result.error}`)
        }
      }
    } catch (err: any) {
      showStatus(`❌ 連線失敗：${err.message}`)
    } finally {
      setIsIngesting(false)
    }
  }

  const showStatus = (msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  // Handle settings toggle
  const toggleSettings = () => {
      const nextState = !showSettings
      setShowSettings(nextState)
      setSaveKeyError('')
      
      if (window.electronAPI) {
          if (nextState) {
              // Opening settings: Ensure window is large enough
              window.electronAPI.resizeWindow(440, 580)
          } else {
              // Closing settings: Restore size based on isExpanded
              if (isExpanded) {
                  window.electronAPI.resizeWindow(440, 580)
              } else {
                  window.electronAPI.resizeWindow(320, 80)
              }
          }
      }
  }

  // 狀態燈顏色對應
  const statusDotColor = {
    connecting: 'bg-yellow-400',
    online: 'bg-emerald-400',
    offline: 'bg-red-400',
  }

  const statusDotGlow = {
    connecting: 'shadow-[0_0_6px_rgba(250,204,21,0.6)]',
    online: 'shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    offline: 'shadow-[0_0_6px_rgba(248,113,113,0.6)]',
  }

  return (
    <div className="w-screen h-screen bg-[rgba(18,18,24,0.94)] backdrop-blur-2xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden font-sans relative">
      
      {/* ── 標題列（可拖曳）── */}
      <div className="drag-region flex items-center justify-between px-4 py-2 bg-gradient-to-r from-white/[0.03] to-white/[0.01] border-b border-white/[0.06] min-h-[40px]">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full animate-pulse-dot ${statusDotColor[backendStatus]} ${statusDotGlow[backendStatus]} transition-colors duration-500`}
          />
          <h1 className="text-[13px] font-semibold text-white/90 tracking-wide">
            Side-by-Side
          </h1>
          <span className="text-[10px] text-white/25 font-mono">
            {backendStatus === 'online' ? (apiKeyConfigured ? 'READY' : 'SETUP') : backendStatus === 'connecting' ? '...' : 'OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-2 no-drag">
           <button
            onClick={toggleSettings}
            className="text-white/40 hover:text-white/80 transition-colors p-1"
            title="設定"
          >
            <Settings size={14} />
          </button>

          <button
            onClick={handleToggle}
            className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 text-[11px] font-medium px-3 py-1 rounded-lg border border-indigo-400/20 hover:border-indigo-400/40 transition-all duration-200 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]"
          >
            {isExpanded ? '⌃ 收合' : '⌄ 展開'}
          </button>
        </div>
      </div>

      {/* ── Settings Overlay ── */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-in">
          <div className="bg-[#1e1e24] border border-white/10 rounded-xl p-5 shadow-2xl w-full max-w-[300px]">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Key size={14} className="text-indigo-400" /> API 設定
                </h3>
                {apiKeyConfigured && (
                  <button onClick={toggleSettings} className="text-white/30 hover:text-white">
                    <X size={14} />
                  </button>
                )}
             </div>
             
             {apiKeyConfigured ? (
               <div className="flex gap-2 items-start bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mb-3">
                 <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                   已儲存 Gemini API Key。如需更換，輸入新的 Key 後儲存即可。
                 </p>
               </div>
             ) : (
               <p className="text-xs text-white/50 mb-3 leading-relaxed">
                 請輸入您的 Google Gemini API Key 以啟用 AI 功能。
               </p>
             )}

             <div className="space-y-3">
               <input 
                  type="password" 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste API Key here..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500/50 outline-none"
               />
               <button
                  onClick={handleSaveApiKey}
                  disabled={isSavingKey}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 {isSavingKey ? '儲存中...' : <><Check size={12} /> 儲存並啟用</>}
               </button>

               {backendStatus === 'offline' && (
                 <div className="flex gap-2 items-start bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                   <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                   <p className="text-[11px] text-red-300/90 leading-relaxed">
                     後端服務未連線，儲存將會失敗。請確認 Backend（start.bat 開啟的視窗）正在執行。
                   </p>
                 </div>
               )}

               {saveKeyError && (
                 <p className="text-[11px] text-red-400 leading-relaxed break-all animate-fade-in">
                   ❌ {saveKeyError}
                 </p>
               )}
             </div>

             {!apiKeyConfigured && (
               <div className="mt-4 pt-4 border-t border-white/5 flex gap-2 items-start opacity-60">
                  <AlertCircle size={12} className="text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-white/40">首次使用需設定 API Key 才能繼續。</p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* ── 展開後的內容區 ── */}
      {isExpanded && (
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">

          {/* 剪貼簿區塊 */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3 transition-colors hover:bg-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-medium flex items-center gap-1.5">
                📋 剪貼簿
              </p>
              <button
                onClick={handleUseClipboard}
                disabled={!clipboardText}
                className="text-[10px] text-indigo-300/70 hover:text-indigo-300 disabled:text-white/15 transition-colors cursor-pointer disabled:cursor-not-allowed border border-white/5 hover:border-indigo-500/30 px-2 py-0.5 rounded"
              >
                ↓ 載入
              </button>
            </div>
            <p
              className={`text-[11px] leading-relaxed break-all whitespace-pre-wrap select-text max-h-[48px] overflow-y-auto scrollbar-thin ${
                clipboardText ? 'text-white/60' : 'text-white/20 italic'
              }`}
            >
              {clipboardText || '等待複製文字...'}
            </p>
          </div>

          {/* 輸入區 */}
          <div className="flex-shrink-0">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="輸入要分析或匯入的文字..."
              rows={4}
              className="w-full bg-white/[0.04] text-white/80 text-[12px] leading-relaxed placeholder:text-white/20 border border-white/[0.08] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-indigo-400/40 focus:bg-white/[0.06] transition-all duration-200 scrollbar-thin"
            />
          </div>

          {/* 操作按鈕組 */}
          <div className="grid grid-cols-3 gap-2">
            {/* 編劇 AI */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !inputText.trim()}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all duration-200 ${activeTab === 'writer' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
            >
               <Clapperboard size={16} className={isAnalyzing && activeTab === 'writer' ? 'animate-spin' : ''} />
               <span className="text-[10px]">編劇分析</span>
            </button>

            {/* 讀者 AI */}
             <button
              onClick={handleReaderAnalyze}
              disabled={isAnalyzing || !inputText.trim()}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all duration-200 ${activeTab === 'reader' ? 'bg-rose-500/20 border-rose-500/30 text-rose-200' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
            >
               <BookOpen size={16} className={isAnalyzing && activeTab === 'reader' ? 'animate-pulse' : ''} />
               <span className="text-[10px]">讀者評價</span>
            </button>

            {/* 匯入 */}
            <button
              onClick={handleIngest}
              disabled={isIngesting || !inputText.trim()}
              className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border border-white/5 bg-white/5 text-white/60 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/30 transition-all duration-200"
            >
               {isIngesting ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin" /> : <Download size={16} />}
               <span className="text-[10px]">匯入知識庫</span>
            </button>
          </div>

          {/* 狀態訊息 */}
          {statusMessage && (
            <p className="text-[11px] text-center text-emerald-300/80 animate-fade-in">
              {statusMessage}
            </p>
          )}

          {/* 分析結果 */}
          {analysisResult && (
            <div
              ref={resultRef}
              className={`flex-1 rounded-xl border p-3 overflow-y-auto scrollbar-thin min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ${activeTab === 'writer' ? 'bg-indigo-900/10 border-indigo-500/10' : 'bg-rose-900/10 border-rose-500/10'}`}
            >
              <p className={`text-[10px] uppercase tracking-[0.15em] font-medium mb-2 flex items-center gap-2 ${activeTab === 'writer' ? 'text-indigo-300/50' : 'text-rose-300/50'}`}>
                {activeTab === 'writer' ? <><Clapperboard size={10} /> 編劇建議</> : <><BookOpen size={10} /> 讀者評價</>}
              </p>
              <p className="text-[12px] leading-relaxed text-white/75 whitespace-pre-wrap select-text">
                {analysisResult}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
