/** 프롬프트 맨 아래에 들어가는 자리표시. 복사한 뒤 AI 채팅에서 이 자리에 스크립트를 붙여 넣는다. */
export const SCRIPT_MARK = '(여기에 유튜브 스크립트를 붙여 넣으세요)'

/** 출력 예시. 직접 지어낸 문장이며, 앱이 실제로 읽을 수 있는 형식과 같다. */
export const PROMPT_EXAMPLE = {
  cards: [
    {
      en: 'Is this seat taken?',
      ko: '여기 자리 있나요?',
      note: '옆자리에 앉기 전에 묻는 말. seat, taken을 또렷하게 말해요.',
      stress: ['seat', 'taken'],
      native: [10, 16],
      explain: [16, 60],
      role: [60, 70],
      subs: [
        { kind: 'reply', en: 'No, go ahead.', ko: '아니요, 앉으세요.', t: [40, 46], restored: false },
        { kind: 'alt', en: 'Do you mind if I sit here?', ko: '여기 앉아도 될까요?', t: null, restored: true },
      ],
    },
  ],
}

export function buildPrompt(): string {
  return `너는 영어회화 강의 영상의 스크립트(자막)를 복습 카드로 정리하는 도우미야.
아래 [스크립트]를 읽고, 강의에서 다루는 핵심 영어 표현마다 카드 1장씩 만들어 줘.

[규칙]
- 결과는 JSON 코드 블록 하나만 출력해. 앞뒤 설명은 쓰지 마.
- 스크립트에 없는 표현을 지어내지 마. 자막이 불분명해서 네가 추측해 채운 문장은 "restored": true 로 표시해.
- 시간은 스크립트의 타임스탬프를 보고 초 단위 숫자(예: 75) 또는 "1:15" 형식으로 적어. 모르면 null.
- en: 영어 문장 / ko: 자연스러운 한국어 뜻 / note: 언제 쓰는지, 발음·강세 팁 1~2문장
- stress: 문장에서 세게 읽는 단어 목록
- native: 원어민이 그 문장을 말하는 구간, explain: 강사가 설명하는 구간, role: 역할을 나눠 따라 말하는 구간
- subs: 그 표현에 이어지는 대답은 "kind": "reply", 비슷하게 바꿔 쓸 수 있는 표현은 "kind": "alt"

[출력 형식 예시]
\`\`\`json
${JSON.stringify(PROMPT_EXAMPLE, null, 2)}
\`\`\`

[스크립트]
${SCRIPT_MARK}
`
}
