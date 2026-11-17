-- 영어회화 복습장: 5단계 스키마 (Supabase SQL Editor에서 한 번 실행)
-- 여러 번 실행해도 안전하게 만들었다. (if not exists / drop policy if exists)

-- 영상(카드 묶음). 카드는 jsonb 한 덩어리로 저장한다.
create table if not exists public.videos (
  user_id    uuid    not null default auth.uid() references auth.users(id) on delete cascade,
  id         text    not null check (char_length(id) between 1 and 64),
  youtube_id text    not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title      text    not null check (char_length(title) between 1 and 100),
  created_ms bigint  not null,
  cards      jsonb   not null check (jsonb_typeof(cards) = 'array' and pg_column_size(cards) < 1000000),
  share_id   text    unique,                       -- 8단계(공유 링크)에서 사용
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 카드별 내 공부 기록
create table if not exists public.progress (
  user_id    uuid    not null default auth.uid() references auth.users(id) on delete cascade,
  card_id    text    not null check (char_length(card_id) between 1 and 96),
  video_id   text    not null check (char_length(video_id) between 1 and 64),
  dates      jsonb   not null default '[]' check (jsonb_typeof(dates) = 'array' and jsonb_array_length(dates) <= 4000),
  star       boolean not null default false,
  offset_sec integer not null default 0 check (offset_sec between -60 and 60),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- 설정
create table if not exists public.settings (
  user_id    uuid    primary key default auth.uid() references auth.users(id) on delete cascade,
  daily_goal integer not null default 10 check (daily_goal between 1 and 50),
  updated_at timestamptz not null default now()
);

-- 보안: 로그인한 사람은 자기 행만 읽고 쓴다. 로그인 전(anon)은 아무것도 못 한다.
alter table public.videos   enable row level security;
alter table public.progress enable row level security;
alter table public.settings enable row level security;

revoke all on public.videos, public.progress, public.settings from anon;
grant select, insert, update, delete on public.videos, public.progress, public.settings to authenticated;

drop policy if exists "videos: own rows"   on public.videos;
drop policy if exists "progress: own rows" on public.progress;
drop policy if exists "settings: own rows" on public.settings;

create policy "videos: own rows"   on public.videos   for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress: own rows" on public.progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "settings: own rows" on public.settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 수정 시각 자동 갱신
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists touch_videos   on public.videos;
drop trigger if exists touch_progress on public.progress;
drop trigger if exists touch_settings on public.settings;
create trigger touch_videos   before update on public.videos   for each row execute function public.touch_updated_at();
create trigger touch_progress before update on public.progress for each row execute function public.touch_updated_at();
create trigger touch_settings before update on public.settings for each row execute function public.touch_updated_at();

-- ===== 8단계: 공유 링크 (이 아래만 새로 실행해도 된다) =====
-- 공유 코드를 아는 로그인한 사람만 그 영상 한 편(제목·유튜브·카드)을 읽는다. 목록 조회는 불가능하다.
create or replace function public.get_shared_video(code text)
returns table(title text, youtube_id text, cards jsonb)
language sql stable security definer set search_path = public as $$
  select v.title, v.youtube_id, v.cards from public.videos v
  where v.share_id is not null and v.share_id = code limit 1
$$;
revoke all on function public.get_shared_video(text) from public, anon;
grant execute on function public.get_shared_video(text) to authenticated;

-- ===== 9단계: 계정 삭제 (이 아래만 새로 실행해도 된다) =====
-- 로그인한 본인 계정만 지운다. 영상·기록·설정은 on delete cascade 로 함께 지워진다.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
