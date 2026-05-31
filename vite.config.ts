import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base: GitHub Pages 배포 시 워크플로가 VITE_BASE=/레포이름/ 을 주입 → 자동 매칭
// 로컬 dev/preview 는 '/' 사용
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: { host: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '도겸이 포켓몬 수학모험',
        short_name: '수학모험',
        description: '포켓몬과 함께 떠나는 수학 모험 — 시간 압박 없이 즐기는 사칙연산',
        lang: 'ko',
        dir: 'ltr',
        orientation: 'landscape',
        display: 'fullscreen',
        background_color: '#8fd3ff',
        theme_color: '#8fd3ff',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 모든 정적 에셋 프리캐시 → 인터넷 없이 완전 오프라인 동작
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,webp,gif,woff2,json,mp3,ogg,wav}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
});
