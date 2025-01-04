import { cn } from '@/lib/utils'

export function Titlebar({
  children,
  className,
  visible = true
}: {
  children?: React.ReactNode
  className?: string
  visible?: boolean
}) {
  return (
    <div
      className={cn(
        'fixed sm:sticky top-0 w-full z-20 bg-background duration-700 transition-transform [&_svg]:size-4 [&_svg]:shrink-0',
        visible ? '' : '-translate-y-full',
        className
      )}
    >
      {children}
    </div>
  )
}
