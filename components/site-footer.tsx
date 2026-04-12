"use client"

import Link from "next/link"
import { WHATSAPP_LINK } from "@/lib/types"

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-foreground text-card">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-center gap-6">
          <a
            href="https://twitter.com/favour15563"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-card/20"
            aria-label="Follow us on Twitter"
          >
            <TwitterIcon className="h-5 w-5" />
          </a>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-card/20"
            aria-label="Contact us on WhatsApp"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
          <a
            href="https://chisomstudio.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card/10 transition-colors hover:bg-card/20"
            aria-label="Visit our website"
          >
            <GlobeIcon className="h-5 w-5" />
          </a>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6 text-sm md:grid-cols-4">
          <div>
            <h4 className="mb-3 font-semibold text-card">Shop</h4>
            <ul className="flex flex-col gap-2">
              <li><Link href="/" className="text-card/60 transition-colors hover:text-card">All Products</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-card">Account</h4>
            <ul className="flex flex-col gap-2">
              <li><Link href="/login" className="text-card/60 transition-colors hover:text-card">Login</Link></li>
              <li><Link href="/register" className="text-card/60 transition-colors hover:text-card">Register</Link></li>
              <li><Link href="/profile" className="text-card/60 transition-colors hover:text-card">Profile</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-card">Support</h4>
            <ul className="flex flex-col gap-2">
              <li>
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-card/60 transition-colors hover:text-card">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-card">Legal</h4>
            <ul className="flex flex-col gap-2">
              <li><Link href="/terms" className="text-card/60 transition-colors hover:text-card">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-card/10 pt-6 text-center text-sm text-card/50">
          <p>
            {"Built by "}
            <a
              href="https://chisomstudio.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary transition-colors hover:text-primary/80"
            >
              chiboydatabase
            </a>
          </p>
          <p className="mt-1">
            {"Copyright "}&copy;{" "}{new Date().getFullYear()} Excel World. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
