'use client'

import React from 'react'
import { Search } from 'lucide-react'

/**
 * SearchInput Component - Built from Flowbite pattern with Figma Design Tokens
 * 
 * Implements the Flowbite search input pattern with button inside the field:
 * https://flowbite.com/docs/forms/search-input/#search-bar-example
 * 
 * Uses exact Figma design tokens:
 * - Input: px-[8px] py-[6px], rounded-[6px], bg-[#f3f3f3]
 * - Typography: 12px Medium (Noto Sans)
 * - Search button: positioned absolute inside field (right side)
 * - Icon: positioned absolute inside field (left side)
 */

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSearch?: () => void
  showButton?: boolean
  buttonText?: string
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', onSearch, showButton = true, buttonText = 'Search', ...props }, ref) => {
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSearch?.()
    }

    return (
      <form onSubmit={handleSubmit} className={className}>
        <div className="relative">
          {/* Search Icon - Left side */}
          <div className="absolute inset-y-0 left-0 flex items-center pl-[8px] pointer-events-none">
            <Search className="w-[14px] h-[14px] text-[#808080]" />
          </div>
          
          {/* Input Field */}
          <input
            ref={ref}
            type="search"
            className={`
              block w-full
              px-[8px] py-[6px]
              pl-[28px]
              ${showButton ? 'pr-[70px]' : 'pr-[8px]'}
              rounded-[6px]
              bg-[#f3f3f3]
              border-none
              outline-none
              transition-colors
              hover:bg-[#e5e5e5]
              focus:bg-white
              focus:ring-1
              focus:ring-[#808080]
              placeholder:text-[#808080]
            `}
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
            {...props}
          />
          
          {/* Search Button - Right side (inside field) */}
          {showButton && (
            <button
              type="submit"
              className="
                absolute
                right-[4px]
                top-1/2
                -translate-y-1/2
                px-[8px]
                py-[4px]
                rounded-[4px]
                bg-black
                text-white
                transition-opacity
                hover:opacity-90
                active:opacity-80
              "
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              {buttonText}
            </button>
          )}
        </div>
      </form>
    )
  }
)

SearchInput.displayName = 'SearchInput'

