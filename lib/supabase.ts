import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

/* -----------------------------
   🌐 Browser client (client components only)
------------------------------ */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* -----------------------------
   🔒 Admin client (server only)
------------------------------ */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)