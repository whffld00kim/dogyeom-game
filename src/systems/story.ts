export interface Line {
  speaker: string;
  text: string;
}

// 지역(세대) 도착 시 한 번 보여주는 인트로 대사. 큰 글씨로 도겸이가 읽기 좋게 짧고 쉽게.
const INTROS: Record<string, Line[]> = {
  관동: [
    { speaker: '지우', text: '안녕! 나는 지우야.\n포켓몬 마스터가 되는 게 내 꿈이야!' },
    { speaker: '지우', text: '첫 모험은 관동 지방이야.\n피카츄랑 이상해씨 같은 친구들이 살아!' },
    { speaker: '지우', text: '수학 문제를 잘 풀면\n포켓몬 친구를 잡을 수 있어. 같이 가자!' },
  ],
  성도: [
    { speaker: '지우', text: '관동의 친구들을 다 만났어!\n정말 대단해! 👏' },
    { speaker: '지우', text: '이제 성도 지방으로 떠나자.\n새로운 포켓몬들이 기다리고 있어!' },
  ],
  호연: [
    { speaker: '지우', text: '성도도 완성!\n너는 점점 멋진 트레이너가 되고 있어.' },
    { speaker: '지우', text: '다음은 호연 지방이야.\n바다와 화산이 있는 멋진 곳이지!' },
  ],
  신오: [
    { speaker: '지우', text: '호연의 포켓몬을 모두 모았어!\n최고야! ⭐' },
    { speaker: '지우', text: '이번엔 신오 지방.\n눈 덮인 산과 신비한 포켓몬이 많아!' },
  ],
  하나: [
    { speaker: '지우', text: '신오 완료!\n도감이 점점 가득 차고 있어.' },
    { speaker: '지우', text: '하나 지방으로 출발!\n큰 도시와 멋진 포켓몬이 가득해.' },
  ],
  칼로스: [
    { speaker: '지우', text: '하나의 친구들도 다 만났어!\n굉장해!' },
    { speaker: '지우', text: '칼로스 지방은 아주 아름다운 곳이야.\n멋진 포켓몬이 기다려!' },
  ],
  알로라: [
    { speaker: '지우', text: '칼로스 완성!\n너는 진정한 포켓몬 친구야.' },
    { speaker: '지우', text: '따뜻한 섬, 알로라 지방으로 가자!\n신나는 포켓몬이 많아.' },
  ],
  가라르: [
    { speaker: '지우', text: '알로라도 끝!\n정말 자랑스러워.' },
    { speaker: '지우', text: '가라르 지방으로!\n커다랗고 멋진 포켓몬을 만날 수 있어.' },
  ],
  팔데아: [
    { speaker: '지우', text: '가라르까지 완성하다니 대단해!' },
    { speaker: '지우', text: '마지막 모험, 팔데아 지방이야.\n끝까지 함께 포켓몬을 다 모아보자!' },
  ],
};

export function regionIntro(name: string): Line[] {
  return INTROS[name] ?? [{ speaker: '지우', text: `${name} 지방에 도착했다!\n새로운 포켓몬을 만나러 가자!` }];
}
