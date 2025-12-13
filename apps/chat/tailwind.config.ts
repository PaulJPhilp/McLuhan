import type { Config } from 'tailwindcss'

export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                'chat-bg': '#ffffff',
                'chat-border': '#e5e7eb',
                'user-bg': '#dbeafe',
                'assistant-bg': '#f3f4f6',
            },
        },
    },
    plugins: [],
} satisfies Config
