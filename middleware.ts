import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Métodos de cookie compatíveis com o @supabase/ssr
  const cookies = {
    getAll: () => req.cookies.getAll(),
    setAll: (newCookies: { name: string, value: string, options?: any }[]) => {
      newCookies.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options)
      })
    }
  }

  const supabase = createSupabaseServerClient(cookies)
  const { data: { session } } = await supabase.auth.getSession()
  console.log("Middleware session:", session)

  // Protege todas as rotas exceto login e public
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return res
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico|login).*)'],
} 