import * as React from 'react'
import { cn } from '@/lib/utils'

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('inline-flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm', className)}
      {...props}
    />
  )
)
SelectTrigger.displayName = 'SelectTrigger'

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ placeholder, ...props }, ref) => (
    <span ref={ref} className="text-slate-300" {...props}>
      {placeholder}
    </span>
  )
)
SelectValue.displayName = 'SelectValue'

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-md border border-slate-700 bg-slate-900 shadow-md', className)}
      {...props}
    />
  )
)
SelectContent.displayName = 'SelectContent'

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('block w-full px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800', className)}
      {...props}
    />
  )
)
SelectItem.displayName = 'SelectItem'

export { SelectTrigger, SelectValue, SelectContent, SelectItem }
