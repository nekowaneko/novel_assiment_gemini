// MUI 主題配置 - 傳統文書處理風格
// 基於 front-end-spec.md 規格書設計

'use client'

import { createTheme } from '@mui/material/styles'

// 中文字體降級順序：標楷體 → 新細明體 → Noto Serif TC
const chineseFontFamily = [
    '"DFKai-SB"',       // 標楷體 (Windows)
    '"BiauKai"',        // 標楷體 (macOS)
    '"PMingLiU"',       // 新細明體 (Windows)
    '"Noto Serif TC"',  // Google Fonts
    'serif',
].join(',')

// 西文字體
const westernFontFamily = '"Times New Roman", Times, serif'

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1a237e', // 深藍色 (Word 風格)
        },
        secondary: {
            main: '#424242', // 經典深灰
        },
        background: {
            default: '#F0F2F5', // 應用程式背景 (桌面材質色)
            paper: '#FFFFFF',   // 編輯器畫布 (純白紙張)
        },
        text: {
            primary: '#000000', // 高對比黑色正文
        },
    },
    typography: {
        fontFamily: `${westernFontFamily}, ${chineseFontFamily}`,
        // 正文編輯區專用樣式
        body1: {
            fontFamily: chineseFontFamily,
            fontSize: '16px',
            lineHeight: 1.5,
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#F0F2F5',
                },
            },
        },
    },
})

export default theme
