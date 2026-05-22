'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ShieldAlert,
  ScanLine,
  ScrollText,
  Settings,
  HardHat,
  LogOut,
  Menu,
  FileText,
  Landmark,
  Users,
  MonitorDot,
  Trophy,
  CalendarDays,
  BarChart3,
  BookOpen,
  TrendingUp,
  PieChart,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { signOut } from '@/app/auth/actions'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/components/language-provider'
import { useSidebar } from '@/components/sidebar-context'
import type { UserRole, AppRole } from '@/types/database.types'
import type { NavDict } from '@/lib/i18n'

// ── Nav config ─────────────────────────────────────────────────────

type NavLink = { href: string; labelKey: keyof NavDict; icon: React.ElementType; allowedRoles?: AppRole[] }
type NavSection = { headingKey?: keyof NavDict; links: NavLink[] }

const gcPrimaryNavSections: NavSection[] = [
  {
    links: [
      { href: '/gc/projects', labelKey: 'dashboard',  icon: LayoutDashboard },
      { href: '/gc/risk',     labelKey: 'compliance', icon: ShieldAlert },
      { href: '/gc/scan',     labelKey: 'site_gate',  icon: ScanLine },
      { href: '/gc/finance',  labelKey: 'payments',   icon: Landmark, allowedRoles: ['admin', 'finance'] },
      { href: '/gc/settings', labelKey: 'settings',   icon: Settings },
    ],
  },
]

const gcMoreLinks: NavLink[] = [
  { href: '/gc/executive',     labelKey: 'executive',      icon: PieChart,     allowedRoles: ['admin'] },
  { href: '/gc/documents',     labelKey: 'document_vault', icon: FileText },
  { href: '/gc/site-monitor',  labelKey: 'site_monitor',   icon: MonitorDot },
  { href: '/gc/reports',       labelKey: 'reports',        icon: BarChart3 },
  { href: '/gc/audit',         labelKey: 'audit_trails',   icon: ScrollText },
  { href: '/gc/leaderboard',   labelKey: 'leaderboard',    icon: Trophy },
  { href: '/gc/attendance',    labelKey: 'attendance',     icon: CalendarDays },
  { href: '/gc/labor',         labelKey: 'labor',          icon: TrendingUp },
  { href: '/gc/journal',       labelKey: 'journal',        icon: BookOpen },
  { href: '/gc/settings/team', labelKey: 'team',           icon: Users, allowedRoles: ['admin'] },
]

const subNavSections: NavSection[] = [
  {
    headingKey: 'navigation',
    links: [
      { href: '/subcontractor/portal',    labelKey: 'my_portal',      icon: HardHat },
      { href: '/subcontractor/documents', labelKey: 'document_vault', icon: FileText },
      { href: '/subcontractor/settings',  labelKey: 'settings',       icon: Settings },
    ],
  },
]

// ── Sub-components ─────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  onClick,
  badge,
  collapsed,
}: {
  href: string
  label: string
  icon: React.ElementType
  onClick?: () => void
  badge?: boolean
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
        isActive
          ? 'bg-slate-800 text-white'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white',
      )}
    >
      <Icon className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
      {!collapsed && label}
      {badge && (
        collapsed
          ? <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          : <span className="ms-auto h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
      )}
    </Link>
  )
}

function MoreSection({
  links,
  appRole,
  onNavClick,
  collapsed,
}: {
  links: NavLink[]
  appRole: AppRole | null
  onNavClick?: () => void
  collapsed: boolean
}) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const visibleLinks = links.filter(
    (link) => !link.allowedRoles || (appRole != null && link.allowedRoles.includes(appRole)),
  )
  const isMoreActive = visibleLinks.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + '/'),
  )
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('hc-sidebar-more-open')
    if (stored === 'true' || isMoreActive) setOpen(true)
  }, [isMoreActive])

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      localStorage.setItem('hc-sidebar-more-open', String(next))
      return next
    })
  }

  // In icon-only mode show all items directly — no toggle needed
  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {visibleLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={t.nav[link.labelKey]}
            icon={link.icon}
            onClick={onNavClick}
            collapsed={collapsed}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4 shrink-0" />
        {t.nav.more}
        {open ? (
          <ChevronUp className="ms-auto h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="ms-auto h-4 w-4 shrink-0" />
        )}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {visibleLinks.map((link) => (
            <NavItem
              key={link.href}
              href={link.href}
              label={t.nav[link.labelKey]}
              icon={link.icon}
              onClick={onNavClick}
              collapsed={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UserCard({
  fullName,
  role,
  collapsed,
}: {
  fullName: string | null
  role: UserRole | null
  collapsed?: boolean
}) {
  const { t } = useLanguage()
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  if (collapsed) {
    return (
      <div
        title={fullName ?? 'User'}
        className="flex justify-center rounded-lg bg-slate-800 p-2"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-semibold text-white">
          {initials}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-800 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-semibold text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{fullName ?? 'User'}</p>
        {role && (
          <Badge
            variant="secondary"
            className="mt-0.5 h-4 rounded px-1.5 text-[10px] font-medium bg-slate-700 text-slate-300 border-0"
          >
            {role === 'gc' ? t.nav.general_contractor : t.nav.subcontractor}
          </Badge>
        )}
      </div>
    </div>
  )
}

function SidebarContent({
  fullName,
  role,
  appRole,
  onNavClick,
  initialUnreadCount,
  collapsed,
  onToggle,
}: {
  fullName: string | null
  role: UserRole | null
  appRole: AppRole | null
  onNavClick?: () => void
  initialUnreadCount: number
  collapsed: boolean
  onToggle?: () => void
}) {
  const { t } = useLanguage()
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)

  useEffect(() => {
    if (role !== 'gc') return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`gc-notifs-sidebar-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gc_notifications' },
        () => setUnreadCount((c) => c + 1),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [role])

  function renderSection(section: NavSection) {
    const filteredLinks = section.links.filter(
      (link) => !link.allowedRoles || (appRole != null && link.allowedRoles.includes(appRole)),
    )
    if (filteredLinks.length === 0) return null
    return (
      <div key={section.headingKey ?? 'main'}>
        {!collapsed && section.headingKey && (
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {t.nav[section.headingKey]}
          </p>
        )}
        <div className="space-y-0.5">
          {filteredLinks.map((link) => (
            <NavItem
              key={link.href}
              href={link.href}
              label={t.nav[link.labelKey]}
              icon={link.icon}
              onClick={onNavClick}
              badge={role === 'gc' && unreadCount > 0 && link.href === '/gc/projects'}
              collapsed={collapsed}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          'flex items-center py-5',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700 ring-1 ring-slate-600">
          <HardHat className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <>
            <div className="leading-tight min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">HardHat</p>
              <p className="text-xs text-slate-400">{t.nav.compliance}</p>
            </div>
            {role === 'gc' && <NotificationBell />}
          </>
        )}
      </div>

      <Separator className="bg-slate-800" />

      {/* Nav */}
      <nav className="sidebar-nav flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {role === 'subcontractor' ? (
          subNavSections.map((section) => renderSection(section))
        ) : (
          <>
            {gcPrimaryNavSections.map((section) => renderSection(section))}
            <MoreSection
              links={gcMoreLinks}
              appRole={appRole}
              onNavClick={onNavClick}
              collapsed={collapsed}
            />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <Separator className="mb-4 bg-slate-800" />
        <UserCard fullName={fullName} role={role} collapsed={collapsed} />

        <form action={signOut} className="mt-1">
          <Button
            type="submit"
            variant="ghost"
            title={collapsed ? t.common.sign_out : undefined}
            className={cn(
              'w-full text-slate-400 hover:bg-slate-800 hover:text-white',
              collapsed ? 'justify-center px-2' : 'justify-start gap-3',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && t.common.sign_out}
          </Button>
        </form>

        {onToggle && (
          <>
            <Separator className="my-3 bg-slate-800" />
            <button
              onClick={onToggle}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'flex w-full items-center rounded-lg py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3',
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────

export function DashboardSidebar({
  fullName,
  role,
  appRole = null,
  initialUnreadCount = 0,
}: {
  fullName: string | null
  role: UserRole | null
  appRole?: AppRole | null
  initialUnreadCount?: number
}) {
  const [open, setOpen] = useState(false)
  const { collapsed, toggle } = useSidebar()
  const { dir } = useLanguage()
  const isRtl = dir === 'rtl'

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 z-50 hidden flex-col overflow-hidden bg-slate-900 lg:flex',
          'sidebar-collapse-transition',
          collapsed ? 'w-20' : 'w-64',
          isRtl ? 'right-0 left-auto' : 'left-0',
        )}
      >
        <SidebarContent
          fullName={fullName}
          role={role}
          appRole={appRole}
          initialUnreadCount={initialUnreadCount}
          collapsed={collapsed}
          onToggle={toggle}
        />
      </aside>

      {/* ── Mobile top bar + Sheet drawer ── */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="-ms-2 text-slate-600" />
            }
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation menu</span>
          </SheetTrigger>
          <SheetContent
            side={isRtl ? 'right' : 'left'}
            className="w-64 border-0 bg-slate-900 p-0"
          >
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SidebarContent
              fullName={fullName}
              role={role}
              appRole={appRole}
              onNavClick={() => setOpen(false)}
              initialUnreadCount={initialUnreadCount}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>

        <div className="ms-3 flex flex-1 items-center gap-2">
          <HardHat className="h-5 w-5 text-slate-900" />
          <span className="text-sm font-semibold text-slate-900">HardHat Compliance</span>
        </div>
        {role === 'gc' && (
          <div className="me-1">
            <NotificationBell />
          </div>
        )}
      </header>
    </>
  )
}
