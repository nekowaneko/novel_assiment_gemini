// Tiptap 編輯器首行縮排擴展
// 為中文段落自動添加 2em 首行縮排

import { Extension } from '@tiptap/core'

export const ChineseIndent = Extension.create({
    name: 'chineseIndent',

    addGlobalAttributes() {
        return [
            {
                types: ['paragraph'],
                attributes: {
                    textIndent: {
                        default: '2em',
                        renderHTML: () => ({
                            style: 'text-indent: 2em',
                        }),
                        parseHTML: (element) => element.style.textIndent || '2em',
                    },
                },
            },
        ]
    },
})

export default ChineseIndent
