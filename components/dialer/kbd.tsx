import { cn } from '@/lib/utils'

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'ml-1 hidden min-w-5 items-center justify-center rounded border border-current/25 px-1 font-mono text-[10px] leading-4 opacity-70 sm:inline-flex',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
