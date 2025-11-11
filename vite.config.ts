import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  
  // Base CSP configuration
  const cspDirectives = [
    "default-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://amafkhrmrsngfbxyzmya.supabase.co wss://*.supabase.co",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
    "style-src 'self' 'unsafe-inline' https://*.supabase.co",
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    "frame-src 'self' https://*.supabase.co",
  ];

  // Add development-specific CSP rules
  if (isDevelopment) {
    cspDirectives.push("connect-src 'self' ws://localhost:* wss://*");
  }

  return {
    server: {
      host: "::",
      port: 8080,
      headers: {
        'Content-Security-Policy': cspDirectives.join('; '),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      },
      proxy: {
        // Proxy API requests to avoid CORS issues
        '^/api/.*': {
          target: 'https://amafkhrmrsngfbxyzmya.supabase.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: false,
          ws: true
        }
      }
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});