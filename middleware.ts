import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

// ── Routes that require authentication ───────────────────────────────────────
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/review',
  '/tasks',
  '/council',
  '/onboarding',
  '/activity',
  '/settings',
  '/requests',
]

// ── Routes that logged-in users should NOT see (bounce to dashboard) ─────────
const AUTH_ONLY_ROUTES = ['/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Build a mutable response so we can refresh session cookies ──────────────
  let res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          // Write to both the request (so Supabase sees them) and the response
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value)
          })
          res = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options ?? {})
          })
        },
      },
    }
  )

  // ── Refresh session — MUST call getUser() not getSession() ───────────────────
  // getSession() trusts the client-side token; getUser() validates with Supabase.
  const { data: { user } } = await supabase.auth.getUser()

  // ── Guard protected routes ───────────────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (isProtected && !user) {
    const redirectUrl = new URL('/', req.url)
    // Preserve the intended destination so the auth page can redirect after login
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Bounce logged-in users away from the auth page ──────────────────────────
  if (AUTH_ONLY_ROUTES.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, site.webmanifest, icon-*.png
     * - /api/* (API routes handle their own auth)
     * - /auth/* (Supabase auth callback)
     * - /u/* (public profiles — may be viewed logged out)
     * - /join (invite acceptance — works logged out to prompt login)
     */
    '/((?!_next/static|_next/image|favicon.ico|site.webmanifest|icon-|api/|auth/|u/|join).*)',
  ],
}
