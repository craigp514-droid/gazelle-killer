'use client'

import { useState } from 'react'

interface ExpandableTextProps {
  text: string
  maxLength?: number
  className?: string
}

export function ExpandableText({ text, maxLength = 250, className = '' }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const shouldTruncate = text.length > maxLength
  const displayText = isExpanded || !shouldTruncate 
    ? text 
    : text.substring(0, maxLength).trim() + '...'

  return (
    <div className={className}>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{displayText}</p>
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-sm font-medium text-orange-500 hover:text-orange-600"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
