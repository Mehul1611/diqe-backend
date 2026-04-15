'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignupPage() {
    const router = useRouter()
    useEffect(() => {
        router.replace('/auth?tab=signup')
    }, [router])

    return null
}
