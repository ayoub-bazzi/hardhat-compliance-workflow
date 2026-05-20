import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { AppRole } from '@/types/database.types';

// Only these prefixes require authentication.
// Everything else — /, /login, /auth, /gate, /api/*, etc. — is freely accessible.
const PROTECTED_PREFIXES = ['/gc', '/subcontractor'];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

// Roles permitted to access each restricted route group.
const FINANCE_ROLES:  AppRole[] = ['admin', 'finance']
const INSIGHTS_ROLES: AppRole[] = ['admin', 'finance', 'project_manager']
const TEAM_ROLES:     AppRole[] = ['admin']

function requiresFinanceAccess(pathname: string) {
  return pathname.startsWith('/gc/finance')
}

function requiresInsightsAccess(pathname: string) {
  return /^\/gc\/projects\/[^/]+\/insights/.test(pathname)
}

function requiresTeamAccess(pathname: string) {
  return pathname.startsWith('/gc/settings/team')
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always call getUser() first — refreshes the session cookie.
  // Never add logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  function redirectTo(destination: string) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value }) =>
      res.cookies.set(name, value)
    );
    return res;
  }

  // 1. Unauthenticated — only block protected paths; let everything else through.
  if (!user) {
    if (isProtected(pathname)) return redirectTo('/login');
    return supabaseResponse;
  }

  // 2. Authenticated user on login or auth callback — send to their dashboard.
  if (pathname === '/login' || pathname.startsWith('/auth')) {
    return redirectTo('/gc/projects');
  }

  // 3. Onboarding and unauthorized are always reachable by authenticated users.
  if (pathname.startsWith('/onboarding') || pathname.startsWith('/unauthorized')) {
    return supabaseResponse;
  }

  // 4. Role + org + RBAC checks for dashboard routes.
  const isDashboardRoute =
    pathname.startsWith('/gc/') || pathname.startsWith('/subcontractor/');

  if (isDashboardRoute) {
    // Single query — fetches role, app_role, and org_id together.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, app_role, organization_id')
      .eq('id', user.id)
      .single();

    const role    = profile?.role
    const appRole = profile?.app_role as AppRole | null | undefined
    // Prefer the profile column; fall back to JWT app_metadata for sessions
    // that were issued before Phase 21 synced organization_id into the token.
    // getUser() always fetches the current user from the Auth server, so
    // user.app_metadata reflects the latest raw_app_meta_data even when
    // the access token in the cookie hasn't been refreshed yet.
    const orgId   = profile?.organization_id
      ?? (user.app_metadata as Record<string, string> | undefined)?.organization_id
      ?? null

    // ── Cross-route role guards ──────────────────────────────
    if (role === 'gc' && pathname.startsWith('/subcontractor/')) {
      return redirectTo('/gc/projects');
    }
    if (role === 'subcontractor' && pathname.startsWith('/gc/')) {
      return redirectTo('/subcontractor/portal');
    }

    // ── Iron Gate: GC users must have an org ────────────────
    if (pathname.startsWith('/gc/') && role !== 'subcontractor') {
      if (!orgId) {
        return redirectTo('/onboarding');
      }

      // ── RBAC guards (only run after org is confirmed) ────
      // Finance Hub — admin and finance only.
      if (requiresFinanceAccess(pathname)) {
        if (!appRole || !FINANCE_ROLES.includes(appRole)) {
          await supabase.rpc('fn_log_access_denied', {
            p_attempted_path: pathname,
            p_user_role:      appRole ?? 'unknown',
          })
          return redirectTo('/unauthorized')
        }
      }

      // Executive Insights — admin, finance, project_manager.
      if (requiresInsightsAccess(pathname)) {
        if (!appRole || !INSIGHTS_ROLES.includes(appRole)) {
          await supabase.rpc('fn_log_access_denied', {
            p_attempted_path: pathname,
            p_user_role:      appRole ?? 'unknown',
          })
          return redirectTo('/unauthorized')
        }
      }

      // Team Management — admin only.
      if (requiresTeamAccess(pathname)) {
        if (!appRole || !TEAM_ROLES.includes(appRole)) {
          await supabase.rpc('fn_log_access_denied', {
            p_attempted_path: pathname,
            p_user_role:      appRole ?? 'unknown',
          })
          return redirectTo('/unauthorized')
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
