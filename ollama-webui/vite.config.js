import { defineConfig } from 'vite'; 
import react from '@vitejs/plugin-react'; 
 
export default defineConfig({ 
  plugins: [react()], 
  server: { 
    port: 8081, 
    host: '0.0.0.0', 
    strictPort: true, 
    proxy: { 
      '/api/generate': { 
        target: 'http://localhost:11434',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/generate/, '/api/generate')
      },
      '/api/rag': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/rag/, '')
      }
    } 
  },
  preview: {
    port: 8081,
    host: '0.0.0.0',
    strictPort: true
  }
}); 
