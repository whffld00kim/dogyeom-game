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

// HiDPI 태블릿에서 캔버스 텍스트가 흐릿해 보이는 것 방지 (텍스트를 기기 배율로 렌더)
export const TEXT_RES = Math.max(2, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 2));

// 고해상도 렌더 배율: Scale.FIT 는 zoom 을 백버퍼에 반영하지 않으므로,
// gameSize 를 DESIGN×HD 로 키워 캔버스 백버퍼를 실제 화면 픽셀에 맞춘다.
// 각 씬은 create() 에서 applyHiRes(this) 로 카메라를 HD배 줌 → 좌표계는 1280×720 유지.
export const HD = (() => {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const sw = typeof window !== 'undefined' && window.screen ? Math.max(window.screen.width, window.screen.height) : DESIGN.width;
  return Math.max(2, Math.min(3, Math.ceil((sw * dpr) / DESIGN.width)));
})();
