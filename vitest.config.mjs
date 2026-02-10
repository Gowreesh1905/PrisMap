import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: './vitest.setup.jsx',
        css: true,
        alias: {
            '@': resolve(__dirname, './src'),
            'canvas': resolve(__dirname, './src/__mocks__/canvas.js')
        },
        server: {
            deps: {
                inline: ['konva', 'react-konva']
            }
        },
        pool: 'forks',
        isolate: false,
    },
})
