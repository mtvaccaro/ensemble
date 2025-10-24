import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
    
    // Using Ensemble Design Tokens
    const variants = {
      primary: 'bg-source-5 text-neutral-0 hover:opacity-90',
      secondary: 'bg-neutral-1 text-neutral-5 hover:bg-neutral-2',
      outline: 'border border-neutral-2 bg-neutral-0 text-neutral-5 hover:border-source-5',
      ghost: 'text-neutral-5 hover:bg-neutral-1',
      destructive: 'bg-red-600 text-neutral-0 hover:bg-red-700'
    }
    
    // Sizes based on Ensemble spacing and typography
    const sizes = {
      sm: 'h-8 px-4 text-body-sm',  // 8px vertical, 16px horizontal padding
      md: 'h-10 px-6 text-body-med', // 12px horizontal padding
      lg: 'h-12 px-8 text-title-sm'  // 16px horizontal padding
    }
    
    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button } 