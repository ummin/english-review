import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * 프로젝트 주소와 공개용(publishable) 키. 브라우저에 들어가도 되는 값이며,
 * 데이터는 DB의 행 단위 보안 규칙(RLS)이 지킨다. secret/service_role 키는 절대 여기에 넣지 않는다.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://blysqzzhuidlqpwjczzw.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Pn6EZZiW8l-beuzNSw0lsA_X1Z5vYTS'

let client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'er-auth' },
  })
  return client
}
