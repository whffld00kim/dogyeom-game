// 디자인 해상도 — 기본 1280×720(16:9). 기기 화면비에 맞춰 부팅 시 한쪽을 확장해
// FIT 레터박스(상하/좌우 검은 여백)를 제거: 와이드(폰/폴드 커버 21:9)는 가로를,
// 사각(폴드 메인)·16:10(탭)은 세로를 늘림. 16:9 기기에서는 정확히 1280×720(기존과 동일).
// 모든 씬 좌표는 DESIGN 기준(가운데 정렬·가장자리 앵커) — import 시점에 이미 확정됨.
const BASE_W = 1280;
const BASE_H = 720;
function deviceAspect(): number {
  if (typeof window === 'undefined') return BASE_W / BASE_H;
  const w = window.innerWidth || BASE_W;
  const h = window.innerHeight || BASE_H;
  // 가로 게임: 부팅이 세로로 잡혀도 긴변/짧은변으로 판정
  const a = Math.max(w, h) / Math.max(1, Math.min(w, h));
  return Math.min(2.6, Math.max(1.0, a));
}
const ASPECT = deviceAspect();
export const DESIGN =
  ASPECT >= BASE_W / BASE_H
    ? { width: Math.min(1880, Math.round((BASE_H * ASPECT) / 2) * 2), height: BASE_H }
    : { width: BASE_W, height: Math.min(1300, Math.round((BASE_W / ASPECT) / 2) * 2) };

// 한글 지원 폰트 스택 — Jua(화려한 둥근 고딕, public/fonts/Jua-Regular.ttf, index.html @font-face) 우선, 없으면 시스템 한글폰트
export const FONT = 'Jua, "Noto Sans KR", "Malgun Gothic", sans-serif';

export const COLORS = {
  skyTop: 0xbfeaff,
  skyBottom: 0x8fd3ff,
  ground: 0x8bd450,
  groundDark: 0x6cae3a,
  dirt: 0xc89b6a,
  dirtDark: 0xa9805a,
  player: 0xffd24a,
  enemy: 0xff7eb6,
  tile: 0xffa726,
  tileDown: 0xe98e10,
  panel: 0x6c8cff,
  panelLight: 0xeaf0ff,
  white: 0xffffff,
  text: '#2b3a67',
  textLight: '#ffffff',
  good: 0x5ec26a,
  bad: 0xff6b6b,
  coin: 0xffd24a,
  star: 0xffd24a,
  starOff: 0xb9c2d0,
  btn: 0x6c8cff,
  btnGreen: 0x7cc63e,
  btnGray: 0xb9c2d0,
  lock: 0x9aa6b8,
};

export const GROUND_Y = Math.round(DESIGN.height * 0.74); // 지면 기준선 y

// 저사양 기기 판정 — 램 4GB 이하(navigator.deviceMemory ≤ 4)면 저사양.
// 갤럭시 탭 A7 Lite(SM-T225N, 램 3GB·PowerVR GPU)가 백버퍼 2560×1600 + 지역 배경 9장(각 ~2800×1600)을
// 감당 못 해 웹뷰가 죽고 앱이 튕겼다 (2026-09-19). 저사양이면 백버퍼를 화면 실제 픽셀까지만 키우고
// 지역 배경은 bg/lo/ 의 축소본을 쓴다. 강제 지정: localStorage lowGfx='1'(켜기)/'0'(끄기) 또는 URL ?lowgfx=1
export const LOW_END = (() => {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('lowgfx');
    const o = q ?? window.localStorage.getItem('lowGfx');
    if (o === '1') return true;
    if (o === '0') return false;
  } catch {
    /* 저장소 접근 불가 → 자동 판정 */
  }
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof mem === 'number' && mem <= 4;
})();

/** 지역 배경 경로 — 저사양이면 축소본(bg/lo/, 가로 1536) */
export function regionBgPath(i: number): string {
  return LOW_END ? `bg/lo/r${i}.webp` : `bg/r${i}.webp`;
}

// HiDPI 태블릿에서 캔버스 텍스트가 흐릿해 보이는 것 방지 (텍스트를 기기 배율로 렌더)
export const TEXT_RES = Math.max(2, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 2));

// 고해상도 렌더 배율: Scale.FIT 는 zoom 을 백버퍼에 반영하지 않으므로,
// gameSize 를 DESIGN×HD 로 키워 캔버스 백버퍼를 실제 화면 픽셀에 맞춘다.
// 각 씬은 create() 에서 applyHiRes(this) 로 카메라를 HD배 줌 → 좌표계는 1280×720 유지.
export const HD = (() => {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const sw = typeof window !== 'undefined' && window.screen ? Math.max(window.screen.width, window.screen.height) : DESIGN.width;
  const need = (sw * dpr) / DESIGN.width;
  // 저사양: 실제 화면 픽셀까지만 (소수 배율, 1~2). A7 Lite(1340px)는 2 → 약 1.05로 백버퍼 픽셀이 1/4
  if (LOW_END) return Math.max(1, Math.min(2, need));
  return Math.max(2, Math.min(3, Math.ceil(need)));
})();
