"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { db, doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "@/lib/firebase"
import type { Order } from "@/lib/types"
import { BANK_DETAILS } from "@/lib/types"
import { uploadToImgBB } from "@/lib/imgbb"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Loader2, Copy, Check, Upload } from "lucide-react"
import { toast } from "sonner"

export default function PaymentPage(): React.ReactElement {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<"bank" | "verifying" | "proof">("bank")
  const [senderName, setSenderName] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/login"); return }
    const fetchOrder = async () => {
      const snap = await getDoc(doc(db, "orders", params.orderId as string))
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() } as Order)
      }
      setLoading(false)
    }
    fetchOrder()
  }, [user, authLoading, params.orderId, router])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
    toast.success("Copied!")
  }

  const handleSent = () => {
    setPhase("verifying")
    setTimeout(() => setPhase("proof"), 3000)
  }

  const handleSubmitProof = async () => {
    if (!senderName.trim()) {
      toast.error("Please enter the sender's name")
      return
    }
    if (!order || !user) return
    setSubmitting(true)

    try {
      let imageUrl = ""
      if (proofFile) {
        imageUrl = await uploadToImgBB(proofFile)
      }

      await updateDoc(doc(db, "orders", order.id), {
        status: "payment_submitted",
        paymentProof: {
          senderName: senderName.trim(),
          imageUrl,
          submittedAt: serverTimestamp(),
        },
      })

      await addDoc(collection(db, "users", user.uid, "notifications"), {
        userId: user.uid,
        title: "Payment Proof Submitted",
        message: `Your payment proof for order #${order.id} has been submitted. Our team will verify it shortly.`,
        read: false,
        createdAt: serverTimestamp(),
      })

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "purchase",
        amount: order.amountPaid,
        description: `Payment submitted for order #${order.id}`,
        orderId: order.id,
        createdAt: serverTimestamp(),
      })

      toast.success("Payment proof submitted successfully!")
      router.push("/")
    } catch {
      toast.error("Failed to submit proof")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push("/")
    toast.info("Payment cancelled. Your order is still pending.")
  }

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

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center"><p className="text-muted-foreground">Order not found</p></main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {phase === "bank" && (
          <div className="animate-fadeIn rounded-xl border border-border bg-card p-6 shadow-sm">
            <h1 className="mb-2 text-xl font-bold text-foreground">Payment Details</h1>
            <p className="mb-6 text-sm text-muted-foreground">Transfer the exact amount to the account below</p>

            <div className="flex flex-col gap-4 rounded-lg bg-accent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="text-lg font-bold text-foreground">{BANK_DETAILS.accountNumber}</p>
                </div>
                <button onClick={() => copyToClipboard(BANK_DETAILS.accountNumber, "account")} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  {copiedField === "account" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bank Name</p>
                <p className="text-base font-semibold text-foreground">{BANK_DETAILS.bankName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Name</p>
                <p className="text-base font-semibold text-foreground">{BANK_DETAILS.accountName}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Amount to Pay</p>
                  <p className="text-xl font-bold text-primary">{"\u20A6"}{order.amountPaid.toLocaleString()}</p>
                </div>
                <button onClick={() => copyToClipboard(order.amountPaid.toString(), "amount")} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  {copiedField === "amount" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleSent}
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {"I've Sent It"}
              </button>
              <button
                onClick={handleCancel}
                className="w-full rounded-lg border border-border py-3 text-sm font-semibold text-foreground"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        )}

        {phase === "verifying" && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold text-foreground">Verifying payment...</p>
            <p className="text-sm text-muted-foreground">Please wait while we process your request</p>
          </div>
        )}

        {phase === "proof" && (
          <div className="animate-fadeIn rounded-xl border border-border bg-card p-6 shadow-sm">
            <h1 className="mb-2 text-xl font-bold text-foreground">Upload Payment Proof</h1>
            <p className="mb-6 text-sm text-muted-foreground">Please provide the sender details so we can verify your payment</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{"Sender's Name"}</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Name on the bank account"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Payment Screenshot <span className="text-muted-foreground">(optional but important)</span>
                </label>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input p-6 transition-colors hover:border-primary hover:bg-accent">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {proofFile ? proofFile.name : "Click to upload proof"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleSubmitProof}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit Proof
              </button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
