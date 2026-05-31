// 디자인 해상도(가로 16:9) — 모든 좌표는 이 기준, Scale.FIT 로 화면에 맞춤
export const DESIGN = { width: 1280, height: 720 };

// 한글 지원 폰트 스택 (실기기엔 서브셋 woff2 추가 예정)
export const FONT = 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif';

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
