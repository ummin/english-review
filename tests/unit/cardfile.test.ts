import { describe, expect, it } from 'vitest'
import { fileNameFor, parseCardFile, parseTime, parseYoutubeId, toCardFile, withIds } from '../../src/lib/cardfile'
import { buildPrompt, PROMPT_EXAMPLE, SCRIPT_MARK } from '../../src/lib/prompt'

const card = (o: object = {}) => ({ en: 'Hello there', ko: '안녕하세요', note: '', stress: ['Hello'], native: [1, 5], explain: null, role: null, subs: [], ...o })
const ok = (text: string) => {
  const r = parseCardFile(text)
  if (!r.ok) throw new Error(r.errors.join(' / '))
  return r
}
const bad = (text: string) => {
  const r = parseCardFile(text)
  if (r.ok) throw new Error('통과하면 안 되는 입력')
  return r.errors.join(' / ')
}

describe('parseTime', () => {
  it('숫자·m:ss·h:mm:ss', () => {
    expect(parseTime(75)).toBe(75)
    expect(parseTime('1:15')).toBe(75)
    expect(parseTime('1:02:03')).toBe(3723)
    expect(parseTime('65.5')).toBe(65.5)
    expect(parseTime(' 0:10 ')).toBe(10)
  })
  it('잘못된 값은 null', () => {
    for (const v of [-1, NaN, Infinity, 'abc', '1:2:3:4', '', null, undefined, {}, '1:'] as unknown[]) expect(parseTime(v)).toBeNull()
  })
})

describe('parseYoutubeId', () => {
  const id = 'aqz-KE-bpKQ'
  it('여러 주소 형태', () => {
    for (const s of [id, `https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?t=10`, `youtube.com/shorts/${id}`, `https://m.youtube.com/watch?v=${id}&list=x`, `https://www.youtube.com/embed/${id}`, `https://music.youtube.com/watch?v=${id}`, `  ${id}  `]) {
      expect(parseYoutubeId(s), s).toBe(id)
    }
  })
  it('유튜브가 아니거나 길이가 틀리면 null', () => {
    for (const s of ['', 'hello', 'https://example.com/watch?v=' + id, 'https://www.youtube.com/watch?v=short', 'javascript:alert(1)', 'https://evil.com/youtu.be/' + id]) expect(parseYoutubeId(s), s).toBeNull()
  })
})

describe('parseCardFile', () => {
  it('프롬프트 예시 출력을 그대로 읽을 수 있다', () => {
    const r = ok(JSON.stringify(PROMPT_EXAMPLE))
    expect(r.data.cards).toHaveLength(1)
    expect(r.data.cards[0]!.subs.map((s) => s.kind)).toEqual(['reply', 'alt'])
    expect(r.data.cards[0]!.subs[1]!.restored).toBe(true)
    expect(r.data.cards[0]!.native).toEqual([10, 16])
  })
  it('코드 울타리와 앞뒤 설명이 있어도 읽는다', () => {
    const t = '네, 만들었어요!\n```json\n' + JSON.stringify({ cards: [card()] }) + '\n```\n더 필요하면 말씀하세요.'
    expect(ok(t).data.cards[0]!.en).toBe('Hello there')
  })
  it('카드 배열만 와도, 둥근 따옴표여도 읽는다', () => {
    expect(ok(JSON.stringify([card()])).data.cards).toHaveLength(1)
    expect(ok('{“cards”: [{“en”: “Hi”, “ko”: “안녕”}]}').data.cards[0]!.en).toBe('Hi')
  })
  it('시간은 문자열 m:ss 도 받는다', () => {
    const r = ok(JSON.stringify({ cards: [card({ native: ['0:10', '0:16'], explain: [16, '1:00'] })] }))
    expect(r.data.cards[0]!.native).toEqual([10, 16])
    expect(r.data.cards[0]!.explain).toEqual([16, 60])
  })
  it('stress 를 쉼표 문자열로 줘도 된다 / 없으면 빈 목록', () => {
    expect(ok(JSON.stringify({ cards: [card({ stress: 'a, b ,' })] })).data.cards[0]!.stress).toEqual(['a', 'b'])
    expect(ok(JSON.stringify({ cards: [{ en: 'Hi', ko: '안녕' }] })).data.cards[0]!.stress).toEqual([])
  })
  it('한국어 뜻이 없으면 경고만 한다', () => {
    const r = ok(JSON.stringify({ cards: [{ en: 'Hi' }] }))
    expect(r.warnings.join()).toMatch(/카드 1.*ko/)
  })
  it('kind 가 이상하면 대답으로 처리하고 경고한다', () => {
    const r = ok(JSON.stringify({ cards: [card({ subs: [{ kind: 'weird', en: 'Yes', ko: '네' }] })] }))
    expect(r.data.cards[0]!.subs[0]!.kind).toBe('reply')
    expect(r.warnings.length).toBe(1)
  })
  it('오류: 빈 입력·JSON 아님·cards 없음·빈 목록', () => {
    expect(bad('   ')).toMatch(/비어/)
    expect(bad('그냥 글이에요')).toMatch(/JSON/)
    expect(bad('{"cards": ')).toMatch(/JSON/)
    expect(bad('{"foo": 1}')).toMatch(/cards/)
    expect(bad('{"cards": []}')).toMatch(/하나도/)
  })
  it('오류: 카드 번호와 함께 어디가 문제인지 알려 준다', () => {
    expect(bad(JSON.stringify({ cards: [card(), { ko: '뜻만' }] }))).toMatch(/카드 2.*en/)
    expect(bad(JSON.stringify({ cards: [card({ native: [10, 5] })] }))).toMatch(/카드 1.*native.*끝/)
    expect(bad(JSON.stringify({ cards: [card({ role: [1] })] }))).toMatch(/role.*두 개/)
    expect(bad(JSON.stringify({ cards: [card({ explain: ['a', 'b'] })] }))).toMatch(/explain.*읽을 수 없/)
    expect(bad(JSON.stringify({ cards: [card({ subs: [{ en: '', ko: 'x' }] })] }))).toMatch(/카드 1 · 대답\/비슷한 표현 1.*en/)
    expect(bad(JSON.stringify({ cards: [card({ subs: 'x' })] }))).toMatch(/subs/)
    expect(bad(JSON.stringify({ cards: ['문자열'] }))).toMatch(/카드 1/)
  })
  it('오류: 너무 긴 문장·너무 많은 카드', () => {
    expect(bad(JSON.stringify({ cards: [card({ en: 'a'.repeat(501) })] }))).toMatch(/너무 길어요/)
    expect(bad(JSON.stringify({ cards: Array.from({ length: 201 }, () => card()) }))).toMatch(/200/)
  })
  it('HTML 같은 글자는 그대로 글자로만 남는다(화면에서 태그로 해석되지 않는다)', () => {
    const r = ok(JSON.stringify({ cards: [card({ en: '<img src=x onerror=alert(1)>' })] }))
    expect(r.data.cards[0]!.en).toBe('<img src=x onerror=alert(1)>')
  })
  it('파일 속 youtubeId·title 도 읽는다 (주소가 틀리면 빈 값)', () => {
    const r = ok(JSON.stringify({ title: '제목', youtubeId: 'https://youtu.be/aqz-KE-bpKQ', cards: [card()] }))
    expect(r.data.title).toBe('제목')
    expect(r.data.youtubeId).toBe('aqz-KE-bpKQ')
    expect(ok(JSON.stringify({ youtubeId: 'zzz', cards: [card()] })).data.youtubeId).toBe('')
  })
})

describe('withIds / toCardFile', () => {
  it('id 는 겹치지 않고, 이미 쓰인 id 와도 겹치지 않는다', () => {
    const parsed = ok(JSON.stringify({ cards: Array.from({ length: 50 }, () => card({ subs: [{ en: 'a' }, { en: 'b' }] })) })).data.cards
    const taken = new Set<string>(['v1-eaaaaaa'])
    const cards = withIds('v1', parsed, taken)
    const ids = cards.flatMap((c) => [c.id, ...c.subs.map((s) => s.id)])
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((i) => i.startsWith('v1-'))).toBe(true)
    expect(ids).not.toContain('v1-eaaaaaa')
  })
  it('내보낸 파일은 진행 기록·id 없이 다시 읽힌다', () => {
    const cards = withIds('v1', ok(JSON.stringify(PROMPT_EXAMPLE)).data.cards)
    const text = toCardFile({ title: '제목', youtubeId: 'aqz-KE-bpKQ', cards })
    expect(text).not.toMatch(/v1-e|dates|star|offset|"id"/)
    const back = ok(text)
    expect(back.data.title).toBe('제목')
    expect(back.data.youtubeId).toBe('aqz-KE-bpKQ')
    expect(back.data.cards).toEqual(ok(JSON.stringify(PROMPT_EXAMPLE)).data.cards)
  })
  it('파일 이름', () => {
    expect(fileNameFor('공항에서 쓰는 / 영어?')).toBe('공항에서_쓰는_영어.cards.json')
    expect(fileNameFor('///')).toBe('cards.cards.json')
  })
})

describe('buildPrompt', () => {
  it('규칙·예시·스크립트 자리가 들어 있다', () => {
    const p = buildPrompt()
    expect(p).toContain('[규칙]')
    expect(p).toContain('"cards"')
    expect(p.trimEnd().endsWith(SCRIPT_MARK)).toBe(true)
    expect(p).toContain('restored')
  })
  it('프롬프트 안의 JSON 예시를 꺼내 붙이면 앱이 읽을 수 있다', () => {
    expect(ok(buildPrompt().split('[출력 형식 예시]')[1]!.split('[스크립트]')[0]!).data.cards).toHaveLength(1)
  })
})
