'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, ShieldX, FileX, Clock, CheckCheck, X } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { markAllNotificationsRead, markNotificationRead } from '@/app/(dashboard)/gc/notifications/actions'
import type { InAppNotification } from '@/types/database.types'

// ── Event type config ──────────────────────────────────────────

const EVENT_CONFIG: Record<
  InAppNotification['event_type'],
  { icon: React.ElementType; dot: string; label: string }
> = {
  DOCUMENT_REJECTED: { icon: FileX,    dot: 'bg-red-500',    label: 'Document Rejected' },
  GATE_DENIED:       { icon: ShieldX,  dot: 'bg-red-600',    label: 'Gate Denied'        },
  EXPIRY_WARNING:    { icon: Clock,    dot: 'bg-amber-500',  label: 'Expiry Warning'    },
  PREQUAL_SUBMITTED: { icon: Bell,     dot: 'bg-indigo-500', label: 'Prequal Submitted' },
}

// ── Single notification row ────────────────────────────────────

function NotifRow({
  notif,
  onRead,
  onClose,
}: {
  notif: InAppNotification
  onRead: (id: string) => void
  onClose: () => void
}) {
  const cfg = EVENT_CONFIG[notif.event_type] ?? EVENT_CONFIG.DOCUMENT_REJECTED
  const Icon = cfg.icon
  const ts = new Date(notif.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const inner = (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-800/60 ${!notif.is_read ? 'bg-slate-800/30' : ''}`}
    >
      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cfg.dot}`}>
        <Icon className="h-3 w-3 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white leading-snug">{notif.title}</p>
        <p className="mt-0.5 text-xs text-slate-400 leading-snug">{notif.body}</p>
        <p className="mt-1 text-[10px] text-slate-600 tabular-nums">{ts}</p>
      </div>
      {!notif.is_read && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(notif.id) }}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-700 hover:text-slate-300"
          aria-label="Mark as read"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )

  if (notif.link) {
    return (
      <Link href={notif.link} onClick={onClose} className="block">
        {inner}
      </Link>
    )
  }
  return <div>{inner}</div>
}

// ── Main bell component ────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const [isPending, startTransition] = useTransition()

  const fetchNotifs = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('in_app_notifications')
      .select('id, event_type, title, body, link, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    const rows = (data ?? []) as InAppNotification[]
    setNotifs(rows)
    setUnreadCount(rows.filter((n) => !n.is_read).length)
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchNotifs()

    const supabase = createBrowserClient()
    // Unique name per effect invocation: the Supabase client is a singleton and
    // keys channels by name. A fixed name causes Strict Mode's double-mount to
    // retrieve the already-subscribed channel and throw on the second .on() call.
    const channel = supabase
      .channel(`notifs-bell-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'in_app_notifications' },
        (payload) => {
          const n = payload.new as InAppNotification
          setNotifs((prev) => [n, ...prev].slice(0, 5))
          setUnreadCount((c) => c + 1)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifs])

  // Click-outside closes the dropdown
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (
        !dropdownRef.current?.contains(t) &&
        !bellRef.current?.contains(t)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function handleBellClick() {
    if (!open && bellRef.current) {
      const r = bellRef.current.getBoundingClientRect()
      setDropPos({
        top:  r.bottom + 8,
        left: Math.max(8, r.right - 304), // right-align 304px-wide dropdown
      })
    }
    setOpen((v) => !v)
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    })
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    })
  }

  const dropdown = open && mounted ? (
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
      className="w-76 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-bold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={isPending}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 transition-colors hover:text-indigo-300 disabled:opacity-50"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <Bell className="h-6 w-6 text-slate-700" />
          <p className="text-xs text-slate-500">All caught up — no notifications</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700/40 max-h-80 overflow-y-auto">
          {notifs.map((n) => (
            <NotifRow
              key={n.id}
              notif={n}
              onRead={handleMarkOne}
              onClose={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  ) : null

  return (
    <>
      <button
        ref={bellRef}
        onClick={handleBellClick}
        aria-label="Notifications"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {mounted && dropdown && createPortal(dropdown, document.body)}
    </>
  )
}
