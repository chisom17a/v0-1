"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { db, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "@/lib/firebase"
import type { Order } from "@/lib/types"
import { WHATSAPP_LINK } from "@/lib/types"
import { Loader2, Eye, Truck, X as XIcon, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

export default function AdminShipmentsPage(): React.ReactElement {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const snap = await getDocs(collection(db, "orders"))
        const ords = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Order)
          .filter((o) => o.status === "approved" || o.status === "shipped" || o.status === "delivered")
        // Sort: awaiting shipment (approved) first, then shipped, then delivered
        ords.sort((a, b) => {
          const priority: Record<string, number> = { approved: 0, shipped: 1, delivered: 2 }
          return (priority[a.status] ?? 99) - (priority[b.status] ?? 99)
        })
        setOrders(ords)
      } catch {
        toast.error("Failed to load shipments")
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const handleShip = async (order: Order) => {
    if (!confirm("Mark this order as shipped?")) return
    setProcessing(order.id)
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "shipped" })

      await addDoc(collection(db, "users", order.userId, "notifications"), {
        userId: order.userId,
        title: "Order Shipped",
        message: `Your product is on its way to ${order.shipmentDetails.address}, ${order.shipmentDetails.state}. Contact: ${order.shipmentDetails.phone}. If you have any issues, please contact us on WhatsApp.`,
        read: false,
        createdAt: serverTimestamp(),
        whatsappLink: WHATSAPP_LINK,
      })

      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "shipped" } : o))
      toast.success("Order marked as shipped!")
    } catch {
      toast.error("Failed to update shipment")
    } finally {
      setProcessing(null)
    }
  }

  const handleDelay = async (order: Order) => {
    if (!confirm("Mark this order as delayed? The user will be notified.")) return
    setProcessing(order.id)
    try {
      await addDoc(collection(db, "users", order.userId, "notifications"), {
        userId: order.userId,
        title: "Shipment Delayed",
        message: `The delivery of your order #${order.id.slice(0, 8)} has been delayed. For more information, please contact us on WhatsApp.`,
        read: false,
        createdAt: serverTimestamp(),
        whatsappLink: WHATSAPP_LINK,
      })

      toast.success("User notified about delay")
    } catch {
      toast.error("Failed to notify user")
    } finally {
      setProcessing(null)
    }
  }

  const handleDelivered = async (order: Order) => {
    if (!confirm("Mark this order as delivered?")) return
    setProcessing(order.id)
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "delivered" })

      await addDoc(collection(db, "users", order.userId, "notifications"), {
        userId: order.userId,
        title: "Order Delivered",
        message: `Your order #${order.id.slice(0, 8)} has been delivered. Thank you for shopping with ChiStore! If you have any issues, please contact us.`,
        read: false,
        createdAt: serverTimestamp(),
        whatsappLink: WHATSAPP_LINK,
      })

      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "delivered" } : o))
      toast.success("Order marked as delivered!")
    } catch {
      toast.error("Failed to update status")
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      approved: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Awaiting Shipment" },
      shipped: { bg: "bg-blue-50", text: "text-blue-700", label: "Shipped" },
      delivered: { bg: "bg-green-50", text: "text-green-700", label: "Delivered" },
    }
    const s = map[status] || { bg: "bg-muted", text: "text-muted-foreground", label: status }
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Shipments ({orders.length})</h1>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Truck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No shipments to manage</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">Order</th>
                <th className="px-4 py-3 font-medium text-foreground">User Email</th>
                <th className="px-4 py-3 font-medium text-foreground">Destination</th>
                <th className="px-4 py-3 font-medium text-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <>
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">#{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{order.userEmail}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.shipmentDetails.state}</td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/80"
                        >
                          <Eye className="h-3 w-3" />
                          {expandedOrder === order.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {order.status === "approved" && (
                          <>
                            <button
                              onClick={() => handleShip(order)}
                              disabled={processing === order.id}
                              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              {processing === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                              Ship
                            </button>
                            <button
                              onClick={() => handleDelay(order)}
                              disabled={processing === order.id}
                              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XIcon className="h-3 w-3" /> Delay
                            </button>
                          </>
                        )}
                        {order.status === "shipped" && (
                          <button
                            onClick={() => handleDelivered(order)}
                            disabled={processing === order.id}
                            className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {processing === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedOrder === order.id && (
                    <tr key={`${order.id}-details`}>
                      <td colSpan={5} className="border-b border-border px-4 py-4">
                        <div className="animate-fadeIn grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="mb-2 text-sm font-semibold text-foreground">Products to Ship</h4>
                            {order.items.map((item, idx) => (
                              <div key={idx} className="mb-2 flex items-center gap-2 rounded-lg border border-border p-2">
                                {item.productImage && (
                                  <img src={item.productImage || "/placeholder.svg"} alt={item.productName} className="h-10 w-10 rounded-md object-cover" />
                                )}
                                <div>
                                  <p className="text-xs font-medium text-foreground">{item.productName}</p>
                                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h4 className="mb-2 text-sm font-semibold text-foreground">Delivery Details</h4>
                            <div className="rounded-lg bg-accent p-3 text-xs">
                              <p><strong>Address:</strong> {order.shipmentDetails.address}</p>
                              <p><strong>State:</strong> {order.shipmentDetails.state}</p>
                              {order.shipmentDetails.landmarks && <p><strong>Landmarks:</strong> {order.shipmentDetails.landmarks}</p>}
                              <p className="mt-2"><strong>Phone:</strong> {order.shipmentDetails.phone}</p>
                              <p><strong>Alt Phone:</strong> {order.shipmentDetails.alternativePhone}</p>
                              <p><strong>Email:</strong> {order.shipmentDetails.email}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
