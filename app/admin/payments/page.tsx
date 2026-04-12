"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { db, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "@/lib/firebase"
import type { Order } from "@/lib/types"
import { WHATSAPP_LINK } from "@/lib/types"
import { Loader2, Eye, Check, X as XIcon, ImageIcon } from "lucide-react"
import { toast } from "sonner"

export default function AdminPaymentsPage(): React.ReactElement {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingProof, setViewingProof] = useState<string | null>(null)
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const snap = await getDocs(collection(db, "orders"))
        const ords = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
        // Sort: unverified (payment_submitted) first, then verified, then rest
        ords.sort((a, b) => {
          const priority: Record<string, number> = {
            payment_submitted: 0,
            pending_payment: 1,
            payment_verified: 2,
            approved: 3,
            rejected: 4,
            shipped: 5,
            delivered: 6,
          }
          return (priority[a.status] ?? 99) - (priority[b.status] ?? 99)
        })
        setOrders(ords)
      } catch {
        toast.error("Failed to load payments")
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const handleApprovePayment = async (order: Order) => {
    if (!confirm("Approve this payment? This confirms the payment was received.")) return
    setProcessing(order.id)
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "payment_verified" })

      // Add the amount to user total purchase
      const userDoc = await getDoc(doc(db, "users", order.userId))
      if (userDoc.exists()) {
        const data = userDoc.data()
        await updateDoc(doc(db, "users", order.userId), {
          totalSpending: (data.totalSpending || 0) + order.totalAmount,
        })
      }

      // Add purchase transaction
      await addDoc(collection(db, "transactions"), {
        userId: order.userId,
        type: "purchase",
        amount: order.totalAmount,
        description: `Payment verified for order #${order.id}`,
        orderId: order.id,
        createdAt: serverTimestamp(),
      })

      // Notify user
      await addDoc(collection(db, "users", order.userId, "notifications"), {
        userId: order.userId,
        title: "Payment Verified",
        message: `The finance department has received your payment for order #${order.id} and has sent it to the marketing department to deliver it to ${order.shipmentDetails.address}, ${order.shipmentDetails.state}.`,
        read: false,
        createdAt: serverTimestamp(),
      })

      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "payment_verified" } : o))
      toast.success("Payment approved!")
    } catch {
      toast.error("Failed to approve payment")
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectPayment = async (order: Order) => {
    if (!confirm("Reject this payment? The user will be notified that the payment was not received.")) return
    setProcessing(order.id)
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "rejected" })

      // Credit back cashback if any was used
      if (order.cashbackUsed > 0) {
        const userDoc = await getDoc(doc(db, "users", order.userId))
        if (userDoc.exists()) {
          const data = userDoc.data()
          await updateDoc(doc(db, "users", order.userId), {
            cashbackBalance: (data.cashbackBalance || 0) + order.cashbackUsed,
          })
        }
        await addDoc(collection(db, "transactions"), {
          userId: order.userId,
          type: "cashback_credit",
          amount: order.cashbackUsed,
          description: `Cashback refund - payment rejected for order #${order.id}`,
          orderId: order.id,
          createdAt: serverTimestamp(),
        })
      }

      // Notify user
      await addDoc(collection(db, "users", order.userId, "notifications"), {
        userId: order.userId,
        title: "Payment Rejected",
        message: `The payment of \u20A6${order.amountPaid.toLocaleString()} for order #${order.id} was not received. Please contact us for more information.`,
        read: false,
        createdAt: serverTimestamp(),
        whatsappLink: WHATSAPP_LINK,
      })

      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "rejected" } : o))
      toast.success("Payment rejected and user notified")
    } catch {
      toast.error("Failed to reject payment")
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pending_payment: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Awaiting Payment" },
      payment_submitted: { bg: "bg-blue-50", text: "text-blue-700", label: "Proof Submitted" },
      payment_verified: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Verified" },
      approved: { bg: "bg-green-50", text: "text-green-700", label: "Order Approved" },
      rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
      shipped: { bg: "bg-purple-50", text: "text-purple-700", label: "Shipped" },
      delivered: { bg: "bg-teal-50", text: "text-teal-700", label: "Delivered" },
    }
    const s = map[status] || { bg: "bg-muted", text: "text-muted-foreground", label: status }
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return d.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  // Only show orders that have payment-related activity
  const paymentOrders = orders.filter((o) => o.status !== "pending_payment" || o.paymentProof)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Payment Verification</h1>

      {paymentOrders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No payment submissions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">Order ID</th>
                <th className="px-4 py-3 font-medium text-foreground">User</th>
                <th className="px-4 py-3 font-medium text-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-foreground">Items</th>
                <th className="px-4 py-3 font-medium text-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-foreground">Proof</th>
                <th className="px-4 py-3 font-medium text-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">#{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">{order.userName}</p>
                      <p className="text-xs text-muted-foreground">{order.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{"\u20A6"}{order.amountPaid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{order.items.length} item(s)</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    {order.paymentProof ? (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground">{order.paymentProof.senderName}</p>
                        {order.paymentProof.imageUrl ? (
                          <button
                            onClick={() => setViewingProof(order.paymentProof!.imageUrl!)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            <ImageIcon className="h-3 w-3" /> View Proof
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No image</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not submitted</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {order.status === "payment_submitted" ? (
                        <>
                          <button
                            onClick={() => handleApprovePayment(order)}
                            disabled={processing === order.id}
                            className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {processing === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectPayment(order)}
                            disabled={processing === order.id}
                            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <XIcon className="h-3 w-3" /> Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setViewingOrder(order)}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/80"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Proof Image Modal */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setViewingProof(null)}>
          <div className="animate-fadeIn relative max-h-[85vh] max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingProof(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-foreground/80 p-1.5 text-card hover:bg-foreground"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" />
            </button>
            <img src={viewingProof || "/placeholder.svg"} alt="Payment proof" className="h-full w-full object-contain" />
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setViewingOrder(null)}>
          <div className="animate-fadeIn max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Order #{viewingOrder.id.slice(0, 8)}</h3>
              <button onClick={() => setViewingOrder(null)} className="text-muted-foreground hover:text-foreground"><XIcon className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <p><strong>User:</strong> {viewingOrder.userName} ({viewingOrder.userEmail})</p>
              <p><strong>Status:</strong> {viewingOrder.status.replace(/_/g, " ")}</p>
              <p><strong>Total:</strong> {"\u20A6"}{viewingOrder.totalAmount.toLocaleString()}</p>
              <p><strong>Paid:</strong> {"\u20A6"}{viewingOrder.amountPaid.toLocaleString()}</p>
              {viewingOrder.cashbackUsed > 0 && <p><strong>Cashback Used:</strong> {"\u20A6"}{viewingOrder.cashbackUsed.toLocaleString()}</p>}
              <div>
                <strong>Items:</strong>
                {viewingOrder.items.map((item, idx) => (
                  <div key={idx} className="mt-1 rounded-md border border-border p-2 text-xs">
                    {item.productName} - Qty: {item.quantity} - {"\u20A6"}{(item.price * item.quantity).toLocaleString()}
                  </div>
                ))}
              </div>
              <div>
                <strong>Ship to:</strong> {viewingOrder.shipmentDetails.address}, {viewingOrder.shipmentDetails.state}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
