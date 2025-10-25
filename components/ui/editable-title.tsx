'use client'

import React, { useState, useRef, useEffect } from 'react'

interface EditableTitleProps {
  value: string
  onChange: (newValue: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * EditableTitle Component
 * 
 * Inline editable text with hover and active states
 * - Single click to edit
 * - Blur to save
 * - Hover state shows editability
 * - Active editing state with visual border
 * - Auto-revert to placeholder if empty
 */
export function EditableTitle({
  value,
  onChange,
  placeholder = 'Untitled',
  maxLength = 100,
  className = '',
  style = {}
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync internal state when external value changes
  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    
    // If empty or only whitespace, revert to placeholder
    const trimmedValue = editValue.trim()
    if (!trimmedValue) {
      setEditValue(placeholder)
      onChange(placeholder)
    } else {
      // Only call onChange if value actually changed
      if (trimmedValue !== value) {
        onChange(trimmedValue)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Enforce max length
    if (newValue.length <= maxLength) {
      setEditValue(newValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter to save
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur() // Trigger blur which handles save
    }
    // Escape to cancel editing
    else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(value) // Revert to original
      setIsEditing(false)
      inputRef.current?.blur()
    }
  }

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select() // Select all text for easy replacement
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        className={`
          bg-white
          border-2
          border-[#ac00f6]
          rounded-[4px]
          px-[6px]
          py-[2px]
          outline-none
          w-full
          ${className}
        `}
        style={style}
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        cursor-text
        rounded-[4px]
        px-[6px]
        py-[2px]
        transition-all
        ${isHovered 
          ? 'bg-[#f3f3f3] border-2 border-[#e5e5e5]' 
          : 'bg-transparent border-2 border-transparent'
        }
        ${className}
      `}
      style={style}
    >
      {editValue || placeholder}
    </div>
  )
}

