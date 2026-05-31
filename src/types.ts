// 공용 타입 정의

export type Op = 'add' | 'sub' | 'mul' | 'div';
export type AnswerMode = 'choice' | 'input'; // 선택 / 입력
export type GameMode = 'explore' | 'challenge'; // 탐험(타이머 없음) / 도전(보너스 타이머)
export type TimeLevel = 'easy' | 'normal' | 'hard';

export interface OpSetting {
  enabled: boolean;
  min: number; // 피연산자 최소
  max: number; // 피연산자 최대
}

export interface Settings {
  ops: Record<Op, OpSetting>;
  answerMode: AnswerMode;
  mode: GameMode;
  timeLevel: TimeLevel;
}

export interface Problem {
  op: Op;
  a: number;
  b: number;
  answer: number;
  text: string; // 예: "6 × 8"
  choices: number[]; // 선택 모드용 보기 4개 (정답 포함)
}
