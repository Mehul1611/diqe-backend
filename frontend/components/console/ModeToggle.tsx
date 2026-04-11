import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getModeLabels } from '@/lib/onboarding-i18n'

const ICON_BOLT = '/icons/bolt-17836096.png'
const ICON_THINKING = '/icons/design-thinking-2857527.png'

export type ResponseMode = 'fast' | 'thinking'

type ModeToggleProps = {
    value: ResponseMode
    onChange: (mode: ResponseMode) => void
    className?: string
    language?: string
}

export function ModeToggle({ value, onChange, className, language = 'English' }: ModeToggleProps) {
    const labels = getModeLabels(language)

    return (
        <div
            className={cn(
                'inline-flex rounded-xl border border-slate-700/80 bg-slate-800/50 p-1 shadow-inner backdrop-blur-sm',
                className,
            )}
            role="group"
            aria-label="Response mode"
        >
            {(['fast', 'thinking'] as const).map((m) => {
                const active = value === m
                const label = m === 'fast' ? labels.fast : labels.thinking
                const iconSrc = m === 'fast' ? ICON_BOLT : ICON_THINKING
                return (
                    <motion.button
                        key={m}
                        type="button"
                        onClick={() => onChange(m)}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                            'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-200',
                            active ? 'text-white' : 'text-slate-400 hover:text-slate-200',
                        )}
                    >
                        {active && (
                            <motion.span
                                layoutId="mode-pill"
                                className={cn(
                                    'absolute inset-0 rounded-lg shadow-md',
                                    m === 'fast'
                                        ? 'bg-emerald-600 shadow-emerald-900/30 ring-1 ring-emerald-400/40'
                                        : 'bg-amber-600 shadow-amber-900/30 ring-1 ring-amber-400/40',
                                )}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-1.5">
                            <img
                                src={iconSrc}
                                alt=""
                                width={m === 'fast' ? 14 : 20}
                                height={m === 'fast' ? 14 : 20}
                                className={cn(
                                    'shrink-0 object-contain opacity-95',
                                    m === 'fast' ? 'h-3.5 w-3.5' : 'h-5 w-5',
                                )}
                                aria-hidden
                            />
                            <span>{label}</span>
                        </span>
                    </motion.button>
                )
            })}
        </div>
    )
}
