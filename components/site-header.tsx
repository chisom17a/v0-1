"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { auth, signOut } from "@/lib/firebase"
import { ShoppingCart, User, LogOut, Bell, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { db, collection, query, where, onSnapshot } from "@/lib/firebase"

export function SiteHeader() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [cartCount, setCartCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "cart"),
      (snap) => setCartCount(snap.size)
    )
    return () => unsub()
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("read", "==", false)
    )
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size))
    return () => unsub()
  }, [user])

  const handleLogout = async () => {
    await signOut(auth)
    toast.success("Logged out successfully")
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">E</span>
          </div>
          <span className="text-xl font-bold text-foreground">Excel World</span>
        </Link>

        <nav className="flex items-center gap-1">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link
                href="/notifications"
                className="relative flex items-center rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/cart"
                className="relative flex items-center rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className="flex items-center rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="h-5 w-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
