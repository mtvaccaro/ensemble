'use client'

import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

/**
 * Input Component - Built from Figma Search Field Design (node 22-1701)
 * 
 * Uses ALL exact Figma design tokens:
 * - Height: h-[32px]
 * - Padding: px-[8px] py-[6px]
 * - Border radius: rounded-[6px]
 * - Gap: gap-[2px]
 * - Background: default → #f3f3f3, active/focus → white
 * - Border: default → none, hover/active → 2px #3d00f6
 * - Typography: 14px Regular, lineHeight: 1.2, letterSpacing: -0.28px
 * - Placeholder color: #808080
 * - Text color: #000000
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block mb-1" style={{
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: '1.2',
            letterSpacing: '-0.24px',
            color: '#000000'
          }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            flex
            items-center
            w-full
            h-[32px]
            px-[8px]
            py-[6px]
            gap-[2px]
            rounded-[6px]
            bg-[#f3f3f3]
            border-2
            border-transparent
            transition-all
            hover:border-[#3d00f6]
            focus:bg-white
            focus:border-[#3d00f6]
            focus:outline-none
            disabled:opacity-50
            disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500' : ''}
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          style={{
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '1.2',
            letterSpacing: '-0.28px',
            color: '#000000'
          }}
          {...props}
        />
        {error && (
          <p className="mt-1" style={{
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: '1.2',
            letterSpacing: '-0.24px',
            color: '#ef4444'
          }}>
            {error}
          </p>
        )}
        <style jsx>{`
          input::placeholder {
            color: #808080;
          }
        `}</style>
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
