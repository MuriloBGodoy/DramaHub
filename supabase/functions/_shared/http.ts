import { createClient } from 'npm:@supabase/supabase-js@2'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Cliente com o JWT de quem chamou: as regras de RLS valem igual no app. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
}

/** Devolve a resposta 403 se quem chamou nao liberou o Estudio. */
export async function requireAdmin(db: SupabaseClient): Promise<Response | null> {
  const { data, error } = await db.rpc('is_admin')
  if (error || data !== true) return json({ error: 'Só o administrador pode fazer isso (libere o Estúdio no Perfil)' }, 403)
  return null
}
