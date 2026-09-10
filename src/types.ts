// 공용 타입 정의

export type Op = 'add' | 'sub' | 'mul' | 'div';
export type AnswerMode = 'choice' | 'input'; // 선택 / 입력
export type GameMode = 'explore' | 'challenge'; // 탐험(타이머 없음) / 도전(보너스 타이머)
export type TimeLevel = 'easy' | 'normal' | 'hard';
export type Subject = 'math' | 'hangul' | 'mix'; // 과목: 수학 / 한글 / 섞기(반반)

export interface OpSetting {
  enabled: boolean;
  presetIndex: number; // 해당 연산의 프리셋 목록에서의 인덱스(범위/단 설정)
}

export interface Settings {
  ops: Record<Op, OpSetting>;
  answerMode: AnswerMode;
  mode: GameMode;
  timeLevel: TimeLevel;
  maxMiss: number; // 10문제 중 틀려도 포켓몬을 잡을 수 있는 최대 횟수 (1/2/3/5)
  subject: Subject; // 과목: 수학 / 한글 / 섞기(수학·한글 반반)
  hangulLevel: number; // 한글 단계 1~4 (글자 고르기/맞는 글자/한 글자 쓰기/이름 쓰기)
  mixEasier: boolean; // 쉬운 문제 섞기: 켜면 고른 프리셋보다 낮은 단계 문제가 반씩 섞인다 (2026-09-10)
}

export interface Problem {
  op: Op;
  a: number;
  b: number;
  answer: number;
  text: string; // 예: "6 × 8"
  choices: number[]; // 선택 모드용 보기 4개 (정답 포함)
}
