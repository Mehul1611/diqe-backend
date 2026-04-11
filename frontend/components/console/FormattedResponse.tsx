'use client'

import { useCallback, useState, type ReactNode } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import { Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

function maybeBoostPlainText(content: string): string {
  const t = content.trim()
  if (!t || t.length < 280) return content
  if (/[#*|`\[\]]/.test(t)) return content
  if (t.includes('\n##') || t.includes('\n- ') || t.includes('\n|')) return content
  if (!t.includes('\n') && t.length >= 280) {
    return `### Answer\n\n${t}`
  }
  return content
}

const LANG_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  rs: 'rust',
  go: 'go',
}

function normalizeLang(raw: string | undefined): string {
  if (!raw) return 'text'
  const m = /language-([\w-+]+)/.exec(raw)
  const tag = (m?.[1] ?? 'text').toLowerCase()
  return LANG_ALIASES[tag] ?? tag
}

function CodeBlock({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const lang = normalizeLang(className)
  const code = String(children).replace(/\n$/, '')
  const lineCount = code.split('\n').length

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [code])

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-lg border border-slate-600/70 bg-slate-950/80 shadow-inner">
      <div className="flex items-center justify-between gap-2 border-b border-slate-600/50 bg-slate-900/90 px-3 py-1.5">
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {lang}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-emerald-400"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={lang === 'text' ? 'plaintext' : lang}
          style={oneDark}
          showLineNumbers={lineCount > 1}
          wrapLines={false}
          customStyle={{
            margin: 0,
            padding: '0.75rem 1rem',
            borderRadius: 0,
            fontSize: '0.8125rem',
            lineHeight: 1.65,
            background: 'rgb(2 6 23 / 0.92)',
            whiteSpace: 'pre',
            wordBreak: 'normal',
          }}
          lineNumberStyle={{
            minWidth: '2.5rem',
            paddingRight: '1rem',
            color: 'rgb(100 116 139)',
            userSelect: 'none',
            textAlign: 'right',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              tabSize: 2,
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 border-b border-slate-700 pb-1 text-lg font-semibold tracking-tight text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-base font-semibold text-emerald-200/90">{children}</h3>
  ),
  p: ({ children }) => <p className="my-2 leading-relaxed text-slate-200">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1.5 leading-relaxed text-slate-200">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1.5 leading-relaxed text-slate-200">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="text-slate-100">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-emerald-500/50 pl-3 italic text-slate-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-700" />,
  table: ({ children }) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg border border-slate-600/80">
      <table className="min-w-full border-collapse text-left text-sm text-slate-200">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-800/90 text-slate-100">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-700">{children}</tbody>,
  tr: ({ children }) => <tr className="border-slate-700 even:bg-slate-800/40">{children}</tr>,
  th: ({ children }) => <th className="whitespace-nowrap px-3 py-2 font-medium">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
  code: ({ className, children }) => {
    const inline = !className
    if (inline) {
      return (
        <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.8125rem] text-emerald-200">
          {children}
        </code>
      )
    }
    return <CodeBlock className={className}>{children}</CodeBlock>
  },
  pre: ({ children }) => <>{children}</>,
}

type FormattedResponseProps = {
  content: string
  preprocess?: boolean
}

export function FormattedResponse({ content, preprocess = true }: FormattedResponseProps) {
  const raw = preprocess ? maybeBoostPlainText(content) : content
  const [copiedAll, setCopiedAll] = useState(false)

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(raw)
      setCopiedAll(true)
      window.setTimeout(() => setCopiedAll(false), 2000)
    } catch {
      setCopiedAll(false)
    }
  }, [raw])

  if (!raw.trim()) {
    return <span className="text-slate-500 italic">…</span>
  }

  return (
    <div className="relative max-w-none text-[15px] tracking-wide text-slate-200">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={copyAll}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-800/50 px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors',
            'hover:border-emerald-500/40 hover:bg-slate-800 hover:text-emerald-400',
          )}
          aria-label="Copy full response"
        >
          {copiedAll ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              Copy response
            </>
          )}
        </button>
      </div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {raw}
      </ReactMarkdown>
    </div>
  )
}
