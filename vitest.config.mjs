import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
<<<<<<< HEAD
import path from 'path'
=======
import { resolve } from 'path'
>>>>>>> a6cb815f8e03a78741c7434ac32abbd76b54cc3d

export default defineConfig({
    plugins: [react()],
    test: {
<<<<<<< HEAD
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.mjs'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
=======
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
        poolOptions: {
            forks: {
                isolate: false
            }
        }
>>>>>>> a6cb815f8e03a78741c7434ac32abbd76b54cc3d
    },
})
