"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { WHATSAPP_LINK } from "@/lib/types"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Link href="/" className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-foreground">Terms & Conditions</h1>

        <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>
              Welcome to Excel World. By accessing or using our website, you agree to be bound by these Terms and Conditions.
              Please read them carefully before making any purchases or creating an account. If you do not agree to these terms,
              please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Account Registration</h2>
            <p>
              To make purchases on Excel World, you must create an account and verify your email address. You are responsible
              for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete
              information during registration and to keep your account information up to date.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Products and Pricing</h2>
            <p>
              All product descriptions, images, and prices are subject to change without prior notice. While we strive to
              display products as accurately as possible, actual colors and appearance may vary slightly from the images shown.
              Prices are displayed in Nigerian Naira ({"\u20A6"}) and are inclusive of all applicable charges unless stated otherwise.
              Some products may be limited to specific states in Nigeria.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Orders and Payments</h2>
            <p>
              All orders are subject to availability and confirmation. Payment must be made through the approved payment method
              (bank transfer to the designated account). Proof of payment must be submitted for verification. Orders will only
              be processed after payment has been verified by our finance department. Excel World reserves the right to reject
              any order at its discretion.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Cashback Policy</h2>
            <p>
              Cashback credits may be issued at the discretion of Excel World administration. Cashback can be used for full or
              partial payment of orders. Cashback balance is non-transferable and cannot be exchanged for cash. In the event
              of an order rejection, the paid amount will be credited to your cashback balance.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Shipping and Delivery</h2>
            <p>
              Delivery times may vary depending on your location within Nigeria. Excel World is not responsible for delays
              caused by circumstances beyond our control. You are required to provide accurate shipping information including
              a valid phone number and address. Delivery will be attempted to the address specified during checkout.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Returns and Refunds</h2>
            <p>
              If you receive a damaged or incorrect product, please contact us immediately via WhatsApp. Refunds, when
              approved, will be credited to your cashback balance. Requests must be made within 48 hours of delivery.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Privacy</h2>
            <p>
              Your personal information is collected and stored securely. We do not share your personal data with third
              parties except as required to process your orders and deliver products. Your payment information is handled
              securely and is not stored on our servers beyond what is necessary for transaction verification.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">9. Account Termination</h2>
            <p>
              Excel World reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent
              activity, or misuse the platform in any way.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">10. Contact</h2>
            <p>
              For any questions, concerns, or support, please contact us via{" "}
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                WhatsApp
              </a>
              . We aim to respond to all inquiries within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">11. Changes to Terms</h2>
            <p>
              Excel World reserves the right to modify these Terms and Conditions at any time. Changes will be effective
              immediately upon posting on the website. Your continued use of the platform after changes constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <div className="mt-4 rounded-xl border border-border bg-accent p-4 text-center">
            <p className="text-xs text-accent-foreground">
              Last updated: February 2026
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {"Built by "}
              <a href="https://chisomstudio.vercel.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                chiboydatabase
              </a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
