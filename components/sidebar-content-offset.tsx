'use client'

import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/sidebar-context'
import { useLanguage } from '@/components/language-provider'

export function SidebarContentOffset({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const { dir } = useLanguage()
  const isRtl = dir === 'rtl'

  return (
    <div
      className={cn(
        'content-offset-transition',
        collapsed
          ? isRtl ? 'lg:pr-20 lg:pl-0' : 'lg:pl-20 lg:pr-0'
          : isRtl ? 'lg:pr-64 lg:pl-0' : 'lg:pl-64 lg:pr-0',
      )}
    >
      {children}
    </div>
  )
}
