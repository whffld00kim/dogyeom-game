# 도겸이 포켓몬 수학모험 🐲

도겸이(7세)를 위한 태블릿 수학 게임. 시간 압박 없이 곱셈·나눗셈을 즐기고, 몬스터를 모으고 꾸미는 오토런 퀴즈 게임.

## 실행 방법

```bash
npm install      # 최초 1회 (이미 완료됨)
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 배포용 빌드 (dist/ 생성, PWA 포함)
npm run preview  # 빌드 결과 미리보기 (태블릿에서 접속해 설치 테스트)
```

태블릿에서 같은 와이파이로 `http://<PC_IP>:5173` 접속 → 브라우저 메뉴 "홈 화면에 추가"로 설치하면 오프라인 동작.

## 현재 상태 (Phase 1 — MVP 완료 ✅)

- **6개 화면**: 타이틀 → 스테이지맵 → 게임플레이 → 결과 / 설정
- **시간 압박 완화**: 탐험 모드(타이머 없음, ×/÷ 기본) / 도전 모드(타이머 있어도 절대 실패·차감 없음)
- **무한 스테이지**: 절차적 생성, 5스테이지마다 몬스터 포획·10마다 보스(예정)
- **경제**: +/− 1코인, ×/÷ 5코인 / 스테이지
- **저장**: IndexedDB(코인·별·해금 자동 저장)
- 아트는 임시 도형 (Phase 3에서 실제 포켓몬 스프라이트로 교체)

## 폴더 구조

```
src/
  main.ts            게임 진입점
  theme.ts           색상·폰트·디자인 상수
  widgets.ts         버튼·배경·별·코인 등 UI 헬퍼
  types.ts           공용 타입
  systems/           엔진 무관 순수 로직 (테스트 용이)
    mathGenerator.ts   문제·오답 생성 (÷ 나누어떨어짐, − 음수없음)
    stageGenerator.ts  스테이지 절차 생성
    settings.ts        기본 설정·옵션
    save.ts            IndexedDB 저장
    rng.ts             시드 난수
  scenes/            Phaser 씬 (Boot/Title/Settings/StageMap/Game/Result)
```

## 다음 단계

- **Phase 2**: 도감(Dex)·몬스터 수집·상점 꾸미기·스토리 대사·도전 모드 타이머 UI
- **Phase 3**: 실제 포켓몬 스프라이트 적용, Capacitor로 APK 포장(설치형·완전 오프라인)

설계 제안서: `~/.claude/plans/c-users-desktop-pptx-piped-waffle.md`
