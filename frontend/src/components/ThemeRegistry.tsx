// MUI ThemeProvider 客戶端元件封裝
// 正確處理 Next.js App Router SSR

'use client'

import { useState } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { useServerInsertedHTML } from 'next/navigation'
import { theme } from '@/styles/theme'

interface ThemeRegistryProps {
  children: React.ReactNode
}

export const ThemeRegistry = ({ children }: ThemeRegistryProps) => {
  const [cache] = useState(() => {
    const cache = createCache({ key: 'mui' })
    cache.compat = true
    return cache
  })

  useServerInsertedHTML(() => {
    const names = Object.keys(cache.inserted)
    if (names.length === 0) return null
    
    let styles = ''
    for (const name of names) {
      if (cache.inserted[name] && typeof cache.inserted[name] === 'string') {
        styles += cache.inserted[name]
      }
    }
    
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    )
  })

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}

export default ThemeRegistry
