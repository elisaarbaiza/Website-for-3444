import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/login': {
        target: 'http://localhost:5000',
        bypass: (req) => req.method === 'GET' ? '/index.html' : null,
      },
      '/signup': {
        target: 'http://localhost:5000',
        bypass: (req) => req.method === 'GET' ? '/index.html' : null,
      },
      '/logout': {
        target: 'http://localhost:5000',
        bypass: (req) => req.method === 'GET' ? '/index.html' : null,
      },
      '/items': 'http://localhost:5000',
      '/cart': {
        target: 'http://localhost:5000',
        bypass: (req) => req.method === 'GET' ? '/index.html' : null,
      },
      '/products': 'http://localhost:5000',
      '/verify': 'http://localhost:5000',
    }
  }
})
