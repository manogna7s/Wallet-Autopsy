import { useId, useState } from 'react'
import { cn } from '../../lib/format'

export function Tooltip({ content, children, className }) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline cursor-help border-0 bg-transparent p-0 text-inherit decoration-dotted underline-offset-4 hover:underline"
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-40 w-60 -translate-x-1/2 border border-line bg-raised px-3 py-2 text-left text-xs leading-relaxed text-quiet"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
