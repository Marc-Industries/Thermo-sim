import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onValueChange, ...props }, ref) => (
    <div ref={ref} data-value={value} {...props} />
  )
)
Tabs.displayName = 'Tabs'

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('inline-flex h-10 items-center justify-center rounded-md bg-slate-900 p-1', className)}
      {...props}
    />
  )
)
TabsList.displayName = 'TabsList'

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium data-[state=active]:bg-signal-red data-[state=active]:text-white', className)}
      onClick={(e) => {
        const parent = (e.currentTarget as HTMLElement).closest('[data-value]')
        const tabsParent = parent?.parentElement?.closest('div')
        if (tabsParent && value) {
          const onValueChange = (tabsParent as any).__onValueChange
          onValueChange?.(value)
        }
        onClick?.(e)
      }}
      {...props}
    />
  )
)
TabsTrigger.displayName = 'TabsTrigger'

export { Tabs, TabsList, TabsTrigger }
