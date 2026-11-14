import type { Video } from '../types'

/**
 * 개발·화면 확인용 샘플입니다. 직접 지어낸 일반 여행 영어이며 특정 강의 내용이 아닙니다.
 * 시간은 가짜입니다.
 */
const vid = 'SAMPLE00001'
const r = (n: number, k: number) => `${vid}-e${n}-r${k}`

export const sampleVideo: Video = {
  id: vid,
  youtubeId: vid,
  title: '샘플 · 여행 영어 기본 표현',
  createdAt: 1,
  cards: [
    {
      id: `${vid}-e1`, en: 'Is this seat taken?', ko: '여기 자리 있나요?',
      note: '카페나 기차에서 옆자리에 앉기 전에 묻는 말. seat, taken을 또렷하게 말해요.',
      stress: ['seat', 'taken'], native: [10, 16], explain: [16, 60], role: [60, 70],
      subs: [
        { id: r(1, 1), kind: 'reply', en: 'No, go ahead.', ko: '아니요, 앉으세요.', t: [40, 46], restored: false },
        { id: r(1, 2), kind: 'reply', en: 'Sorry, someone is sitting here.', ko: '죄송해요, 누가 앉아 있어요.', t: [46, 54], restored: false },
      ],
    },
    {
      id: `${vid}-e2`, en: 'Could you recommend a good local restaurant?', ko: '근처 맛집 하나 추천해 주실래요?',
      note: '호텔 직원이나 현지인에게 맛집을 물을 때.',
      stress: ['recommend', 'local'], native: [80, 88], explain: [88, 150], role: null,
      subs: [
        { id: r(2, 1), kind: 'reply', en: 'There is a great place around the corner.', ko: '모퉁이 돌면 아주 좋은 곳이 있어요.', t: [120, 130], restored: false },
        { id: r(2, 2), kind: 'alt', en: 'What kind of food are you in the mood for?', ko: '어떤 음식이 당기세요?', t: [130, 140], restored: true },
      ],
    },
    {
      id: `${vid}-e3`, en: 'How long does it take to get to the station?', ko: '역까지 얼마나 걸려요?',
      note: 'long, take, station에 힘이 실려요.',
      stress: ['long', 'take', 'station'], native: null, explain: [170, 215], role: [215, 225],
      subs: [
        { id: r(3, 1), kind: 'reply', en: 'About ten minutes on foot.', ko: '걸어서 10분쯤 걸려요.', t: [200, 208], restored: false },
      ],
    },
    {
      id: `${vid}-e4`, en: "I'd like to check in, please.", ko: '체크인하고 싶습니다.',
      note: '호텔 프런트에서 첫마디.',
      stress: ['check', 'in'], native: [250, 256], explain: [256, 300], role: [300, 310],
      subs: [
        { id: r(4, 1), kind: 'alt', en: 'May I have your name, please?', ko: '성함을 말씀해 주시겠어요?', t: [280, 288], restored: false },
        { id: r(4, 2), kind: 'reply', en: 'It is under Kim.', ko: '김 이름으로 예약했어요.', t: [288, 296], restored: false },
      ],
    },
    {
      id: `${vid}-e5`, en: 'Is breakfast included?', ko: '조식 포함인가요?',
      note: '예약할 때나 체크인할 때 확인해요.',
      stress: ['breakfast', 'included'], native: [330, 335], explain: [335, 370], role: null,
      subs: [
        { id: r(5, 1), kind: 'reply', en: 'Yes, it is served until ten.', ko: '네, 10시까지 제공돼요.', t: [355, 362], restored: false },
      ],
    },
    {
      id: `${vid}-e6`, en: 'Could I get the bill, please?', ko: '계산서 주시겠어요?',
      note: '식당에서 계산할 때.',
      stress: ['get', 'bill'], native: [390, 395], explain: [395, 430], role: [430, 440],
      subs: [
        { id: r(6, 1), kind: 'reply', en: 'Sure, I will bring it right away.', ko: '네, 바로 가져다 드릴게요.', t: [415, 423], restored: false },
        { id: r(6, 2), kind: 'alt', en: 'Would you like to pay together or separately?', ko: '같이 계산하시나요, 따로 하시나요?', t: [423, 432], restored: false },
      ],
    },
  ],
}
