import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin to serve session files from ../dist/output as /output/*
function serveOutputPlugin() {
  return {
    name: 'serve-output',
    configureServer(server: any) {
      server.middlewares.use('/output', (req: any, res: any, next: any) => {
        const outputDir = path.resolve(__dirname, '../dist/output')
        const filePath = path.join(outputDir, req.url || '')

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath)
          res.setHeader('Content-Type', 'application/zip')
          res.end(content)
        } else {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveOutputPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
