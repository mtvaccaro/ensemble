'use client'

import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary'
  size?: 'small' | 'med' | 'large'
  loading?: boolean
  children: React.ReactNode
}

/**
 * Button Component - Built from Figma Design (node 22-2159)
 * 
 * Uses ALL exact Figma design tokens for each variant and size:
 * 
 * Sizes:
 * - small: p-[2px], gap-[2px], rounded-[4px], 12px Medium (lineHeight: 1.2)
 * - med: p-[4px], gap-[2px], rounded-[8px], 14px Medium (lineHeight: 1.2)
 * - large: p-[8px], gap-[4px], rounded-[8px], 16px SemiBold (lineHeight: 1.4)
 * 
 * Variants:
 * - primary: bg-black (#000000), white text
 * - secondary: bg-white, border (#e5e5e5), black text
 * - tertiary: no bg/border, black text
 * 
 * States (auto-handled by CSS):
 * - default: base styles
 * - hover: primary/tertiary get #f3f3f3 bg, secondary gets #f3f3f3 bg
 * - active: primary/tertiary get #e5e5e5 bg, secondary gets #e5e5e5 bg + #808080 border
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'large', loading = false, children, disabled, ...props }, ref) => {
    
    // Base styles - always applied
    const baseStyles = 'inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
    
    // Size styles - using exact Figma tokens
    const sizeStyles = {
      small: 'p-[2px] gap-[2px] rounded-[4px]',
      med: 'p-[4px] gap-[2px] rounded-[8px]',
      large: 'p-[8px] gap-[4px] rounded-[8px]'
    }
    
    // Typography styles - exact Figma specs
    const typographyStyles = {
      small: { 
        fontFamily: 'Noto Sans, sans-serif',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: '1.2',
        letterSpacing: '-0.24px'
      },
      med: {
        fontFamily: 'Noto Sans, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: '1.2',
        letterSpacing: '-0.28px'
      },
      large: {
        fontFamily: 'Noto Sans, sans-serif',
        fontSize: '16px',
        fontWeight: 600,
        lineHeight: '1.4',
        letterSpacing: '-0.32px'
      }
    }
    
    // Variant styles - using exact Figma tokens
    const variantStyles = {
      primary: 'bg-[#000000] text-white hover:opacity-90 active:opacity-80',
      secondary: 'bg-white border border-[#e5e5e5] text-black hover:bg-[#f3f3f3] active:bg-[#e5e5e5] active:border-[#808080]',
      tertiary: 'bg-transparent text-black hover:bg-[#f3f3f3] active:bg-[#e5e5e5]'
    }
    
    const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim()
    
    return (
      <button
        ref={ref}
        className={combinedClassName}
        style={typographyStyles[size]}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
