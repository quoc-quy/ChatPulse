import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.ComponentProps<'input'> {
  errorMessage?: string
}

function Input({ className, type, errorMessage, ...props }: InputProps) {
  return (
    <div className='flex flex-col gap-1'>
      <input
        type={type}
        data-slot='input'
        aria-invalid={!!errorMessage}
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
          'dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs',
          'transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          errorMessage && 'border-destructive focus-visible:ring-destructive/40',
          className
        )}
        {...props}
      />

      {errorMessage && <p className='mt-1 text-red-600 min-h-5 text-sm'>{errorMessage}</p>}
    </div>
  )
}

export { Input }
