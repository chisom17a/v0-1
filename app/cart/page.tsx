"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { db, collection, getDocs, deleteDoc, doc, onSnapshot } from "@/lib/firebase"
import type { CartItem } from "@/lib/types"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Trash2, Loader2, ShoppingCart, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface CartDoc extends CartItem {
  docId: string
}

export default function CartPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    const unsub = onSnapshot(collection(db, "users", user.uid, "cart"), (snap) => {
      const items = snap.docs.map((d) => ({ docId: d.id, ...d.data() }) as CartDoc)
      setCartItems(items)
      setLoading(false)
    })
    return () => unsub()
  }, [user, authLoading, router])

  const removeItem = async (docId: string) => {
    if (!user) return
    setRemoving(docId)
    try {
      await deleteDoc(doc(db, "users", user.uid, "cart", docId))
      toast.success("Item removed from cart")
    } catch {
      toast.error("Failed to remove item")
    } finally {
      setRemoving(null)
    }
  }

  const clearCart = async () => {
    if (!user) return
    setClearingAll(true)
    try {
      const snap = await getDocs(collection(db, "users", user.uid, "cart"))
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref))
      await Promise.all(deletePromises)
      toast.success("Cart cleared")
      setShowClearConfirm(false)
    } catch {
      toast.error("Failed to clear cart")
    } finally {
      setClearingAll(false)
    }
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ShoppingCart className="mb-3 h-12 w-12" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <Link href="/" className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {cartItems.map((item) => (
                <div
                  key={item.docId}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.productImage ? (
                      <img src={item.productImage || "/placeholder.svg"} alt={item.productName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{item.productName}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {"Qty: "}{item.quantity}
                    </p>
                    <p className="mt-1 text-base font-bold text-primary">
                      {"\u20A6"}{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.docId)}
                    disabled={removing === item.docId}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label="Remove item"
                  >
                    {removing === item.docId ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span className="text-primary">{"\u20A6"}{total.toLocaleString()}</span>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => router.push("/checkout")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="rounded-lg border border-destructive px-6 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {showClearConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setShowClearConfirm(false)}>
                <div className="animate-fadeIn w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-foreground">Clear Cart?</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Are you sure you want to remove all items from your cart? This cannot be undone.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={clearCart}
                      disabled={clearingAll}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                    >
                      {clearingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Clear"}
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
