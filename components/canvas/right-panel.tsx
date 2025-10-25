'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RightPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export function RightPanel({ isOpen, onClose, title, children, width = '360px' }: RightPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Panel - no backdrop, Figma-style */}
      <div 
        className="fixed top-0 right-0 h-full bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200 transition-transform duration-300 ease-out"
        style={{ 
          width,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Button
            onClick={onClose}
            variant="secondary"
            size="small"
            className="hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}

