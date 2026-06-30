import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium',
        // Sizing
        size === 'sm' && 'px-2 py-1 text-xs',
        size === 'md' && 'px-2.5 py-1.5 text-sm',
        // Variants
        variant === 'default' && 'bg-muted text-foreground',
        variant === 'success' && 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
        variant === 'warning' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
        variant === 'danger' && 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
      )}
    >
      {children}
    </span>
  )
}
