import { describe, expect, it } from 'vitest'
import { progressToRow, rowToProgress, rowToVideo, videoToRow } from '../../src/storage/supabase'
import { friendlyAuthError } from '../../src/stores/auth'
import { readFileSync } from 'node:fs'

const video = { id: 'v1', youtubeId: 'aqz-KE-bpKQ', title: '제목', createdAt: 1700000000000, cards: [] }

describe('Supabase 행 변환', () => {
  it('영상: 앱 ↔ DB 왕복', () => {
    const row = videoToRow('u1', video)
    expect(row).toMatchObject({ user_id: 'u1', id: 'v1', youtube_id: 'aqz-KE-bpKQ', created_ms: 1700000000000 })
    expect(rowToVideo({ ...row, created_ms: String(row.created_ms) as unknown as number })).toEqual(video) // bigint 가 문자열로 와도 숫자로
  })
  it('깨진 카드 값이 와도 빈 목록으로 처리', () => {
    expect(rowToVideo({ id: 'a', youtube_id: 'x', title: 't', created_ms: 1, cards: null as never }).cards).toEqual([])
  })
  it('기록: 날짜는 정렬, 값이 이상하면 기본값', () => {
    expect(rowToProgress({ card_id: 'c', video_id: 'v', dates: ['2026-02-01', '2026-01-01'], star: true, offset_sec: 3 })).toEqual({ videoId: 'v', dates: ['2026-01-01', '2026-02-01'], star: true, offset: 3 })
    expect(rowToProgress({ card_id: 'c', video_id: 'v', dates: null as never, star: null as never, offset_sec: null as never })).toEqual({ videoId: 'v', dates: [], star: false, offset: 0 })
    expect(progressToRow('u', 'c', { videoId: 'v', dates: ['d'], star: false, offset: -2 })).toEqual({ user_id: 'u', card_id: 'c', video_id: 'v', dates: ['d'], star: false, offset_sec: -2 })
  })
})

describe('friendlyAuthError', () => {
  it('상황별 한국어 안내', () => {
    expect(friendlyAuthError({ code: 'over_email_send_rate_limit', message: 'x' })).toMatch(/너무 자주/)
    expect(friendlyAuthError({ status: 429, message: 'x' })).toMatch(/너무 자주/)
    expect(friendlyAuthError(new Error('Email address not authorized'))).toMatch(/이 이메일로는/)
    expect(friendlyAuthError({ code: 'otp_expired', message: 'Token has expired or is invalid' })).toMatch(/코드가 맞지 않거나/)
    expect(friendlyAuthError(new TypeError('Failed to fetch'))).toMatch(/인터넷/)
    expect(friendlyAuthError(new Error('???'))).toMatch(/문제가 생겼어요/)
  })
})

describe('schema.sql', () => {
  const sql = readFileSync('supabase/schema.sql', 'utf8')
  it('모든 표에 RLS와 본인 행 정책이 있고 anon 권한을 회수한다', () => {
    for (const t of ['videos', 'progress', 'settings']) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`))
      expect(sql).toMatch(new RegExp(`create policy "${t}: own rows"\\s+on public\\.${t}\\s+for all to authenticated`))
    }
    expect(sql).toMatch(/revoke all on public\.videos, public\.progress, public\.settings from anon/)
    expect(sql).not.toMatch(/to anon|to public|using \(true\)/i)
  })
})
