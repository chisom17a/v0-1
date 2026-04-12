"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { db, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "@/lib/firebase"
import type { CartItem, ShipmentDetails, Order } from "@/lib/types"
import { NIGERIA_STATES } from "@/lib/types"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Loader2, ArrowLeft, ArrowRight, Edit3 } from "lucide-react"
import { toast } from "sonner"

type PaymentMethod = "cashback" | "direct" | "mixed"
type Step = "details" | "confirm" | "payment"

interface CartDoc extends CartItem {
  docId: string
}

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>("details")
  const [processing, setProcessing] = useState(false)

  const [shipment, setShipment] = useState<ShipmentDetails>({
    email: "",
    alternativeEmail: "",
    phone: "",
    alternativePhone: "",
    state: "",
    address: "",
    landmarks: "",
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("direct")

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/login"); return }
    setShipment((s) => ({ ...s, email: user.email }))
    const fetchCart = async () => {
      const snap = await getDocs(collection(db, "users", user.uid, "cart"))
      setCartItems(snap.docs.map((d) => ({ docId: d.id, ...d.data() }) as CartDoc))
      setLoading(false)
    }
    fetchCart()
  }, [user, authLoading, router])

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cashbackBalance = user?.cashbackBalance || 0

  const calculatePayment = () => {
    if (paymentMethod === "cashback") {
      return { cashbackUsed: total, amountToPay: 0 }
    }
    if (paymentMethod === "mixed") {
      const cbUsed = Math.min(cashbackBalance, total)
      return { cashbackUsed: cbUsed, amountToPay: total - cbUsed }
    }
    return { cashbackUsed: 0, amountToPay: total }
  }

  const { cashbackUsed, amountToPay } = calculatePayment()

  const validateDetails = () => {
    if (!shipment.phone.trim() || !shipment.alternativePhone.trim()) {
      toast.error("Phone and alternative phone are required")
      return false
    }
    if (!shipment.state) {
      toast.error("Please select a state")
      return false
    }
    if (!shipment.address.trim()) {
      toast.error("Please enter your address")
      return false
    }
    return true
  }

  const handleProceed = () => {
    if (!validateDetails()) return

    if (paymentMethod === "cashback" && cashbackBalance < total) {
      const needed = total - cashbackBalance
      toast.error(
        `Insufficient cashback balance. You need \u20A6${needed.toLocaleString()} more to complete this purchase.`,
        {
          action: {
            label: "Use Mixed Payment",
            onClick: () => {
              setPaymentMethod("mixed")
              toast.info("Payment method changed to Cash back + Direct payment")
            },
          },
        }
      )
      return
    }

    setStep("confirm")
  }

  const handleConfirmOrder = async () => {
    if (!user) return
    setProcessing(true)

    try {
      if (paymentMethod === "cashback") {
        // Deduct cashback and create order directly
        await updateDoc(doc(db, "users", user.uid), {
          cashbackBalance: cashbackBalance - total,
        })

        const orderData: Omit<Order, "id"> = {
          userId: user.uid,
          userEmail: user.email,
          userName: user.fullName,
          items: cartItems.map(({ docId, ...rest }) => rest),
          totalAmount: total,
          amountPaid: 0,
          cashbackUsed: total,
          paymentMethod: "cashback",
          status: "payment_verified",
          shipmentDetails: shipment,
          createdAt: serverTimestamp(),
        }

        const orderRef = await addDoc(collection(db, "orders"), orderData)

        // Add transaction
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          type: "cashback_debit",
          amount: total,
          description: `Payment for order ${orderRef.id} using cashback`,
          orderId: orderRef.id,
          createdAt: serverTimestamp(),
        })

        // Add notification
        await addDoc(collection(db, "users", user.uid, "notifications"), {
          userId: user.uid,
          title: "Order Placed",
          message: `Your order #${orderRef.id} has been placed successfully using cashback. The finance department will review it shortly.`,
          read: false,
          createdAt: serverTimestamp(),
        })

        // Clear cart
        const cartSnap = await getDocs(collection(db, "users", user.uid, "cart"))
        await Promise.all(cartSnap.docs.map((d) => deleteDoc(d.ref)))

        toast.success("Order placed successfully!")
        router.push("/profile")
      } else {
        // Direct or mixed payment - redirect to payment page
        const orderData: Omit<Order, "id"> = {
          userId: user.uid,
          userEmail: user.email,
          userName: user.fullName,
          items: cartItems.map(({ docId, ...rest }) => rest),
          totalAmount: total,
          amountPaid: amountToPay,
          cashbackUsed,
          paymentMethod: paymentMethod === "mixed" ? "mixed" : "direct",
          status: "pending_payment",
          shipmentDetails: shipment,
          createdAt: serverTimestamp(),
        }

        if (cashbackUsed > 0) {
          await updateDoc(doc(db, "users", user.uid), {
            cashbackBalance: cashbackBalance - cashbackUsed,
          })

          await addDoc(collection(db, "transactions"), {
            userId: user.uid,
            type: "cashback_debit",
            amount: cashbackUsed,
            description: `Partial cashback used for order`,
            createdAt: serverTimestamp(),
          })
        }

        const orderRef = await addDoc(collection(db, "orders"), orderData)

        // Clear cart
        const cartSnap = await getDocs(collection(db, "users", user.uid, "cart"))
        await Promise.all(cartSnap.docs.map((d) => deleteDoc(d.ref)))

        router.push(`/payment/${orderRef.id}`)
      }
    } catch (err) {
      toast.error("Failed to process order")
    } finally {
      setProcessing(false)
    }
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

  if (cartItems.length === 0) {
    router.push("/cart")
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <button onClick={() => step === "details" ? router.push("/cart") : setStep("details")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {step === "details" ? "Back to Cart" : "Edit Details"}
        </button>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {["details", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step === s || (s === "details" && step === "confirm")
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className="text-sm font-medium text-foreground capitalize">{s === "details" ? "Shipping" : "Confirm"}</span>
              {i < 1 && <div className="h-0.5 w-8 bg-border" />}
            </div>
          ))}
        </div>

        {step === "details" && (
          <div className="animate-fadeIn flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-foreground">Shipping Details</h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      value={shipment.email}
                      onChange={(e) => setShipment({ ...shipment, email: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Alternative Email <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={shipment.alternativeEmail}
                      onChange={(e) => setShipment({ ...shipment, alternativeEmail: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Phone Number</label>
                    <input
                      type="tel"
                      value={shipment.phone}
                      onChange={(e) => setShipment({ ...shipment, phone: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Alternative Phone</label>
                    <input
                      type="tel"
                      value={shipment.alternativePhone}
                      onChange={(e) => setShipment({ ...shipment, alternativePhone: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">State</label>
                  <select
                    value={shipment.state}
                    onChange={(e) => setShipment({ ...shipment, state: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select state</option>
                    {NIGERIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Full Address</label>
                  <textarea
                    value={shipment.address}
                    onChange={(e) => setShipment({ ...shipment, address: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Landmarks <span className="text-muted-foreground">(help us find you)</span>
                  </label>
                  <input
                    type="text"
                    value={shipment.landmarks}
                    onChange={(e) => setShipment({ ...shipment, landmarks: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-foreground">Payment Method</h2>
              <div className="flex flex-col gap-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                  <input type="radio" name="payment" value="direct" checked={paymentMethod === "direct"} onChange={() => setPaymentMethod("direct")} className="h-4 w-4 accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Direct Payment Only</p>
                    <p className="text-xs text-muted-foreground">Pay the full amount via bank transfer</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                  <input type="radio" name="payment" value="cashback" checked={paymentMethod === "cashback"} onChange={() => setPaymentMethod("cashback")} className="h-4 w-4 accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Cashback Only</p>
                    <p className="text-xs text-muted-foreground">
                      {"Available balance: \u20A6"}{cashbackBalance.toLocaleString()}
                    </p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                  <input type="radio" name="payment" value="mixed" checked={paymentMethod === "mixed"} onChange={() => setPaymentMethod("mixed")} className="h-4 w-4 accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Cashback + Direct Payment</p>
                    <p className="text-xs text-muted-foreground">Use cashback balance and pay the rest</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{"\u20A6"}{total.toLocaleString()}</span></div>
                {cashbackUsed > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Cashback Used</span><span className="text-success">-{"\u20A6"}{cashbackUsed.toLocaleString()}</span></div>
                )}
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-bold">
                  <span className="text-foreground">To Pay</span>
                  <span className="text-primary">{"\u20A6"}{amountToPay.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleProceed}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Proceed <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="animate-fadeIn flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-foreground">Order Summary</h2>
              <p className="mb-3 text-sm text-muted-foreground">Please confirm your details before payment. After payment, they cannot be changed.</p>

              <div className="flex flex-col gap-3">
                {cartItems.map((item) => (
                  <div key={item.docId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.productImage && <img src={item.productImage || "/placeholder.svg"} alt={item.productName} className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{"Qty: "}{item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{"\u20A6"}{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg bg-accent p-4 text-sm">
                <p><strong>Ship to:</strong> {shipment.address}, {shipment.state}</p>
                <p><strong>Phone:</strong> {shipment.phone} / {shipment.alternativePhone}</p>
                <p><strong>Payment:</strong> {paymentMethod === "cashback" ? "Cashback Only" : paymentMethod === "mixed" ? "Cashback + Direct" : "Direct Payment"}</p>
                {cashbackUsed > 0 && <p><strong>Cashback Used:</strong> {"\u20A6"}{cashbackUsed.toLocaleString()}</p>}
                <p className="mt-2 text-lg font-bold text-primary">{"Amount to Pay: \u20A6"}{amountToPay.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleConfirmOrder}
                disabled={processing}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {amountToPay > 0 ? "Pay Now" : "Place Order"}
              </button>
              <button
                onClick={() => setStep("details")}
                className="flex items-center justify-center gap-2 rounded-lg border border-border py-3 px-6 text-sm font-semibold text-foreground"
              >
                <Edit3 className="h-4 w-4" /> Edit
              </button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
