'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type PulsePlusButtonProps = {
  onClick: () => void
  interactionDone: boolean
  className?: string
}

export function PulsePlusButton({ onClick, interactionDone, className }: PulsePlusButtonProps) {
  return (
    <div className="group relative">
      <motion.button
        type="button"
        onClick={onClick}
        animate={
          interactionDone
            ? { scale: 1, boxShadow: '0 0 0 0 rgba(16,185,129,0)' }
            : { scale: [1, 1.08, 1], boxShadow: ['0 0 0 0 rgba(16,185,129,0)', '0 0 12px 2px rgba(16,185,129,0.25)', '0 0 0 0 rgba(16,185,129,0)'] }
        }
        transition={
          interactionDone
            ? { duration: 0.2 }
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
        title="Use this to enable Web Search"
        aria-label="Search mode menu. Use this to enable Web Search"
        className={cn(
          'flex items-center justify-center rounded-full border border-slate-600 bg-slate-800 p-1.5 transition duration-200 hover:scale-105 hover:border-emerald-500/50 hover:bg-slate-700',
          className,
        )}
      >
        <Plus className="h-3.5 w-3.5 text-slate-300" />
      </motion.button>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        Use this to enable Web Search
      </div>
    </div>
  )
}
