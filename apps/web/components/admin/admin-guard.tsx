"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MockApi } from "@/lib/mock-api"

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        // Check auth
        const isAuth = MockApi.isAuthenticated()
        if (!isAuth) {
            router.push("/admin/login")
        } else {
            setAuthorized(true)
        }
    }, [router])

    if (!authorized) {
        // You can return a loading spinner here
        return <div className="flex h-screen items-center justify-center">Checking authorization...</div>
    }

    return <>{children}</>
}
