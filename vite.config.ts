import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base: GitHub Pages 배포 시 워크플로가 VITE_BASE=/레포이름/ 을 주입 → 자동 매칭
// 로컬 dev/preview 는 '/' 사용
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: { host: true },
  plugins: [
    VitePWA({
      // APK는 Capacitor가 에셋을 로컬에서 직접 서빙하므로 Service Worker 불필요.
      // 기존 SW 가 이전 버전을 캐싱해 "덮어 설치해도 옛 버전 동작" 문제를 일으켜서,
      // 자기제거(self-destroying) SW 로 전환 → 캐시 비우고 SW 제거. (게임 데이터=IndexedDB 는 보존)
      selfDestroying: true,
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
        // 앱 코드/아이콘만 프리캐시. 포켓몬 스프라이트(고화질 수백 MB)는 제외 —
        // APK 에셋에 번들되어 로컬에서 직접 로드되므로 오프라인 동작엔 문제없고, SW 중복 캐시만 방지.
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,webp,gif,woff2,json,mp3,ogg,wav}'],
        globIgnores: ['**/sprites/**', '**/items/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
});
