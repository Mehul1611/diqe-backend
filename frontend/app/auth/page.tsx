import { Suspense } from 'react'
import AuthPageClient from './AuthPageClient'

export default function AuthPage() {
    return (
        <Suspense
            fallback={
                <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/25" />
                </div>
            }
        >
            <AuthPageClient />
        </Suspense>
    )
}
