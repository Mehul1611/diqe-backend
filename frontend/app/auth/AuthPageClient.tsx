'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NetworkCanvas from '@/components/NetworkCanvas'

type Tab = 'signin' | 'signup'

export default function AuthPageClient() {
    const router = useRouter()
    const params = useSearchParams()
    const initialTab = params.get('tab') === 'signup' ? 'signup' : 'signin'
    const [tab, setTab] = useState<Tab>(initialTab)

    const { signIn, signUp, user, loading: authLoading } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    /** Briefly mark fields read-only so browsers do not inject another profile’s saved password/email before focus. */
    const [autofillGuard, setAutofillGuard] = useState(true)
    /** After sign-up when email confirmation is required (no session yet). */
    const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null)

    const title = useMemo(() => (tab === 'signin' ? 'Sign in' : 'Create account'), [tab])

    const clearCredentials = useCallback(() => {
        setEmail('')
        setPassword('')
        setConfirm('')
        setError(null)
        setShowPassword(false)
        setPendingConfirmEmail(null)
    }, [])

    useEffect(() => {
        if (authLoading) return
        if (user) {
            router.replace('/dashboard')
        }
    }, [user, authLoading, router])

    useEffect(() => {
        clearCredentials()
        setAutofillGuard(true)
    }, [tab, clearCredentials])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            if (tab === 'signup') {
                if (password !== confirm) {
                    setError('Passwords do not match.')
                    setLoading(false)
                    return
                }
                if (password.length < 8) {
                    setError('Password must be at least 8 characters.')
                    setLoading(false)
                    return
                }
                const signupEmail = email.trim()
                const { error, session } = await signUp(signupEmail, password)
                if (error) { setError(error.message); setLoading(false); return }
                setPassword('')
                setConfirm('')
                setLoading(false)
                if (!session) {
                    setPendingConfirmEmail(signupEmail)
                    setEmail('')
                    return
                }
                clearCredentials()
                router.replace('/dashboard')
                return
            }

            const { error } = await signIn(email, password)
            if (error) { setError(error.message); setLoading(false); return }
            clearCredentials()
            setLoading(false)
            router.replace('/dashboard')
        } catch (err: any) {
            setError(err?.message ?? 'Something went wrong.')
            setLoading(false)
        }
    }

    if (authLoading) {
        return (
            <main className="relative flex min-h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-hidden />
                <span className="sr-only">Checking session…</span>
            </main>
        )
    }

    if (user) {
        return (
            <main className="relative flex min-h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-hidden />
                <span className="sr-only">Redirecting…</span>
            </main>
        )
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
            <NetworkCanvas />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/25" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.07),_transparent_50%)]" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                        <img src="/icons/add-friend.png" alt="" width={22} height={22} className="opacity-90" />
                        <span className="text-sm font-bold tracking-widest uppercase">
                            <span className="text-white">D</span>
                            <span className="text-emerald-500">I</span>
                            <span className="text-white">QE</span>
                        </span>
                    </Link>

                    {!pendingConfirmEmail && (
                        <div className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/60 p-1">
                            <button
                                type="button"
                                onClick={() => setTab('signin')}
                                className={
                                    tab === 'signin'
                                        ? 'rounded-full bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 transition-all'
                                        : 'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 transition-all'
                                }
                            >
                                Sign in
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('signup')}
                                className={
                                    tab === 'signup'
                                        ? 'rounded-full bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 transition-all'
                                        : 'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 blur-[1.5px] opacity-60 hover:blur-0 hover:opacity-100 transition-all'
                                }
                            >
                                Sign up
                            </button>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
                    {pendingConfirmEmail ? (
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                                <Mail className="h-7 w-7 text-emerald-400" aria-hidden />
                            </div>
                            <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Confirm your email</h1>
                            <p className="mb-4 text-sm leading-relaxed text-slate-300">
                                Thanks for signing up. We sent a confirmation link to the address below. Open that email
                                and click the link to verify your account, then come back here to sign in.
                            </p>
                            <p className="mb-6 rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 font-mono text-sm text-emerald-200/90 break-all">
                                {pendingConfirmEmail}
                            </p>
                            <p className="mb-6 text-xs text-slate-500">
                                Did not receive it? Check your spam or promotions folder. The sender should be from your
                                project’s auth provider (e.g. Supabase).
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setPendingConfirmEmail(null)
                                    setTab('signin')
                                    router.replace('/auth?tab=signin')
                                }}
                                className="w-full rounded-full border border-emerald-400/40 bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.35)] transition hover:from-emerald-400 hover:to-emerald-500"
                            >
                                Continue to sign in
                            </button>
                        </div>
                    ) : (
                        <>
                    <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">{title}</h1>
                    <p className="mb-8 text-sm text-slate-400">
                        {tab === 'signin'
                            ? 'Welcome back. Enter your credentials to continue.'
                            : 'Create an account to start building model cards.'}
                    </p>

                    <form
                        onSubmit={submit}
                        autoComplete="off"
                        className="space-y-5"
                    >
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Email
                            </label>
                            <input
                                type="email"
                                name="diqe-auth-email"
                                autoComplete={tab === 'signin' ? 'username' : 'email'}
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                readOnly={autofillGuard}
                                onFocus={() => setAutofillGuard(false)}
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="diqe-auth-password"
                                    autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                                    readOnly={autofillGuard}
                                    onFocus={() => setAutofillGuard(false)}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {tab === 'signup' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-1.5 overflow-hidden"
                                >
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                                        Confirm Password
                                    </label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="diqe-auth-password-confirm"
                                        autoComplete="new-password"
                                        readOnly={autofillGuard}
                                        onFocus={() => setAutofillGuard(false)}
                                        required={tab === 'signup'}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="
                                group relative flex w-full items-center justify-center gap-2
                                overflow-hidden rounded-full border border-emerald-400/40
                                bg-gradient-to-br from-emerald-500 to-emerald-600
                                px-6 py-3 text-sm font-bold uppercase tracking-widest text-white
                                shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4),inset_0_2px_0_rgba(255,255,255,0.3)]
                                transition-all duration-300
                                hover:from-emerald-400 hover:to-emerald-500 hover:scale-[1.02]
                                hover:shadow-[0_12px_28px_-4px_rgba(16,185,129,0.6)]
                                active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50
                            "
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                </>
                            )}
                        </button>
                    </form>
                        </>
                    )}
                </div>
            </motion.div>
        </main>
    )
}
