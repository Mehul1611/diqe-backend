'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getOnboardingCopy, type OnboardingCopy } from '@/lib/onboarding-i18n'
import type { ModeLine } from '@/lib/onboarding-text'

const GLYPH_HOVER = 'Icons from Flaticon (attribute author per license)'

const GLYPH = {
    welcome: [{ src: '/icons/welcome-hands.png', title: 'Welcome' }],
    searchModes: [{ src: '/icons/loupe-751381.png' }],
    language: [{ src: '/icons/languages-3898082.png' }],
    responseModes: [{ src: '/icons/Gemini_Generated_Image_wqgxviwqgxviwqgx.png', title: 'Response modes' }],
    tempChat: [{ src: '/icons/deadline_2612924.png', title: 'Temporary chat' }],
    tip: [{ src: '/icons/idea-1208171.png' }],
}

const ICON_DOC = '/icons/documentation-9746449.png'
const ICON_WEB = '/icons/internet-10453141.png'
const ICON_BOLT = '/icons/bolt-17836096.png'
const ICON_THINKING = '/icons/design-thinking-2857527.png'

type SectionId = keyof typeof GLYPH

const SECTION_ORDER: { id: SectionId; glyphScale: 'prominent' | 'default' }[] = [
    { id: 'welcome', glyphScale: 'prominent' },
    { id: 'searchModes', glyphScale: 'default' },
    { id: 'language', glyphScale: 'default' },
    { id: 'responseModes', glyphScale: 'prominent' },
    { id: 'tempChat', glyphScale: 'default' },
    { id: 'tip', glyphScale: 'default' },
]

const item = {
    hidden: { opacity: 0, y: 10 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.18, duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
    }),
}

function SectionGlyph({
    sources,
    glyphScale,
}: {
    sources: readonly { src: string; title?: string }[]
    glyphScale: 'prominent' | 'default'
}) {
    const prominent = glyphScale === 'prominent'
    return (
        <>
            {sources.map((g) => (
                <img
                    key={g.src}
                    src={g.src}
                    alt=""
                    width={prominent ? 28 : 20}
                    height={prominent ? 28 : 20}
                    className={cn(
                        'object-contain opacity-95 transition-[filter,transform] duration-300 ease-out will-change-[filter,transform]',
                        'group-hover/icon:scale-[1.06] group-hover/icon:[filter:drop-shadow(0_0_10px_rgba(52,211,153,0.95))_drop-shadow(0_0_24px_rgba(16,185,129,0.55))]',
                        prominent ? 'h-7 w-7 max-h-7 max-w-7' : 'h-5 w-5',
                    )}
                    title={g.title ?? GLYPH_HOVER}
                />
            ))}
        </>
    )
}

function InlineMd({ text }: { text: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={i} className="font-semibold text-white">
                            {part.slice(2, -2)}
                        </strong>
                    )
                }
                return <span key={i}>{part}</span>
            })}
        </>
    )
}

function ModeLineRow({
    iconSrc,
    line,
    iconClassName,
}: {
    iconSrc: string
    line: ModeLine
    iconClassName: string
}) {
    return (
        <p>
            <span className="inline-flex items-center gap-2 align-middle">
                <span
                    className={cn(
                        'group/body inline-flex shrink-0 cursor-default items-center justify-center overflow-visible rounded-md',
                        'bg-emerald-500/10 p-1.5',
                        'transition-[box-shadow,background-color,ring] duration-300 ease-out',
                        'hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.38),0_0_8px_rgba(52,211,153,0.22)]',
                        'hover:ring-1 hover:ring-emerald-400/50',
                    )}
                >
                    <img
                        src={iconSrc}
                        alt=""
                        className={cn(
                            iconClassName,
                            'object-contain opacity-95 transition-[filter,transform] duration-300 ease-out will-change-[filter,transform]',
                            'group-hover/body:scale-[1.08] group-hover/body:[filter:drop-shadow(0_0_6px_rgba(52,211,153,0.9))_drop-shadow(0_0_16px_rgba(16,185,129,0.5))]',
                        )}
                        title={GLYPH_HOVER}
                    />
                </span>
                <span>
                    {line.lead}
                    <strong className="font-semibold text-white">{line.term}</strong>
                    {line.tail}
                </span>
            </span>
        </p>
    )
}

function SearchModesBody({ copy }: { copy: OnboardingCopy['searchModes'] }) {
    return (
        <div className="mt-2 space-y-2 border-l-2 border-emerald-500/35 pl-3 text-sm leading-relaxed text-slate-300">
            <ModeLineRow iconSrc={ICON_DOC} line={copy.docLine} iconClassName="h-4 w-4" />
            <ModeLineRow iconSrc={ICON_WEB} line={copy.webLine} iconClassName="h-4 w-4" />
        </div>
    )
}

function ResponseModesBody({ copy }: { copy: OnboardingCopy['responseModes'] }) {
    return (
        <div className="mt-2 space-y-2 border-l-2 border-emerald-500/35 pl-3 text-sm leading-relaxed text-slate-300">
            <ModeLineRow iconSrc={ICON_BOLT} line={copy.fastLine} iconClassName="h-4 w-4" />
            <ModeLineRow iconSrc={ICON_THINKING} line={copy.thinkingLine} iconClassName="h-6 w-6" />
        </div>
    )
}

function sectionTitle(copy: OnboardingCopy, id: SectionId): string {
    switch (id) {
        case 'welcome':
            return copy.welcome.title
        case 'searchModes':
            return copy.searchModes.title
        case 'language':
            return copy.language.title
        case 'responseModes':
            return copy.responseModes.title
        case 'tempChat':
            return copy.tempChat.title
        case 'tip':
            return copy.tip.title
    }
}

function SectionHeading({ id, title }: { id: SectionId; title: string }) {
    if (id === 'welcome') {
        const trimmed = title.trim()
        const space = /\s/.exec(trimmed)
        const idx = space?.index
        const first = idx != null && idx > 0 ? trimmed.slice(0, idx).trim() : trimmed
        const rest = idx != null && idx > 0 ? trimmed.slice(idx + 1).trim() : ''
        return (
            <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="text-lg font-extrabold tracking-tight text-transparent bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text sm:text-xl">
                {first}
                </span>
                {rest ? (
                    <span className="text-sm font-semibold tracking-wide text-white/90">{rest}</span>
                ) : null}
            </h3>
        )
    }
    return (
        <h3 className="text-sm font-semibold tracking-wide text-transparent bg-gradient-to-r from-slate-100 via-slate-200 to-emerald-300/90 bg-clip-text">
            {title}
        </h3>
    )
}

function SectionBody({ id, copy }: { id: SectionId; copy: OnboardingCopy }) {
    switch (id) {
        case 'welcome':
            return (
                <p className="mt-2 border-l-2 border-emerald-500/40 pl-3 text-sm leading-relaxed text-slate-300">
                    <InlineMd text={copy.welcome.body} />
                </p>
            )
        case 'searchModes':
            return <SearchModesBody copy={copy.searchModes} />
        case 'language':
            return (
                <p className="mt-2 border-l-2 border-emerald-500/35 pl-3 text-sm leading-relaxed text-slate-300">
                    <InlineMd text={copy.language.body} />
                </p>
            )
        case 'responseModes':
            return <ResponseModesBody copy={copy.responseModes} />
        case 'tempChat':
            return (
                <p className="mt-2 border-l-2 border-amber-500/45 pl-3 text-sm leading-relaxed text-slate-300">
                    <InlineMd text={copy.tempChat.body} />
                </p>
            )
        case 'tip':
            return (
                <p className="mt-2 border-l-2 border-emerald-500/35 pl-3 text-sm leading-relaxed text-slate-300">
                    <InlineMd text={copy.tip.body} />
                </p>
            )
    }
}

const ONBOARD_HTML_LANG: Record<string, string> = {
    English: 'en',
    Spanish: 'es',
    French: 'fr',
    German: 'de',
    Dutch: 'nl',
    Chinese: 'zh-Hans',
    Japanese: 'ja',
}

export function OnboardingMessage({ language = 'English' }: { language?: string }) {
    const copy = getOnboardingCopy(language)
    const htmlLang = ONBOARD_HTML_LANG[language] ?? 'en'

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mx-auto w-full max-w-[600px] rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-6 shadow-[0_0_40px_rgba(16,185,129,0.06)] backdrop-blur-md"
            lang={htmlLang}
        >
            <div key={language} className="space-y-4 leading-relaxed tracking-wide text-slate-200">
                {SECTION_ORDER.map((row, i) => (
                    <motion.div
                        key={row.id}
                        custom={i}
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="flex gap-3 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/35 via-slate-900/30 to-slate-900/20 p-4 shadow-[inset_0_1px_0_rgba(52,211,153,0.08)] ring-1 ring-emerald-500/10"
                    >
                        <div
                            className={cn(
                                'group/icon relative mt-1 flex h-9 w-9 shrink-0 cursor-default items-center justify-center overflow-visible rounded-lg ring-1 ring-emerald-400/25',
                                'bg-emerald-500/15 text-emerald-400',
                                'transition-[box-shadow,background-color,ring] duration-300 ease-out',
                                'hover:bg-emerald-500/25 hover:shadow-[0_0_28px_rgba(16,185,129,0.45),0_0_12px_rgba(52,211,153,0.25)]',
                                'hover:ring-2 hover:ring-emerald-400/50',
                            )}
                        >
                            <SectionGlyph sources={GLYPH[row.id]} glyphScale={row.glyphScale} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <SectionHeading id={row.id} title={sectionTitle(copy, row.id)} />
                            <SectionBody id={row.id} copy={copy} />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
