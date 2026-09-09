import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Valores públicos do backend (URL + chave publishable/anon).
// Ficam versionados como fallback porque o `.env` não vai para o repositório,
// e sem eles o build publicado quebra ("supabaseUrl is required").
const FALLBACK_SUPABASE_URL = "https://ldiadiezzooivgittjvj.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWFkaWV6em9vaXZnaXR0anZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjM4NzUsImV4cCI6MjA4MDE5OTg3NX0.TlZ0nV6uR9BAYW7VVvSSgiUwqviUAPlWJSDeAG1x7pk";
const FALLBACK_SUPABASE_PROJECT_ID = "ldiadiezzooivgittjvj";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace("T", " ")
    ),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY
    ),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
      env.VITE_SUPABASE_PROJECT_ID || FALLBACK_SUPABASE_PROJECT_ID
    ),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "robots.txt"],
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "Godoy Prime Analytics",
        short_name: "Godoy Prime",
        description: "Analytics premium para mercado imobiliário de luxo na Barra da Tijuca",
        theme_color: "#0C2340",
        background_color: "#0C2340",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Force navigation requests to always fetch from network first
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            // App shell and JS/CSS - always check network first
            urlPattern: /\.(js|css|html)$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "app-shell-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
