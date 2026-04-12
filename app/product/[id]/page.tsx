"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Product, CartItem } from "@/lib/types"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Heart, ShoppingCart, ArrowLeft, ExternalLink, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { arrayUnion, arrayRemove } from "firebase/firestore"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id) return
      try {
        const snap = await getDoc(doc(db, "products", params.id as string))
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() } as Product)
        }
      } catch {
        toast.error("Failed to load product")
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [params.id])

  useEffect(() => {
    if (user && product) {
      setIsLiked(user.likedProducts?.includes(product.id) || false)
    }
  }, [user, product])

  const handleLike = async () => {
    if (!user) {
      toast.error("Please login to like products")
      return
    }
    if (!product) return
    try {
      const userRef = doc(db, "users", user.uid)
      const productRef = doc(db, "products", product.id)
      if (isLiked) {
        await updateDoc(userRef, { likedProducts: arrayRemove(product.id) })
        await updateDoc(productRef, { likes: (product.likes || 1) - 1 })
        setProduct((p) => p ? { ...p, likes: (p.likes || 1) - 1 } : p)
      } else {
        await updateDoc(userRef, { likedProducts: arrayUnion(product.id) })
        await updateDoc(productRef, { likes: (product.likes || 0) + 1 })
        setProduct((p) => p ? { ...p, likes: (p.likes || 0) + 1 } : p)
      }
      setIsLiked(!isLiked)
    } catch {
      toast.error("Failed to update like")
    }
  }

  const toggleImageSelection = (img: string) => {
    setSelectedImages((prev) =>
      prev.includes(img) ? prev.filter((i) => i !== img) : [...prev, img]
    )
  }

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please login to add to cart")
      router.push("/login")
      return
    }
    if (!user.emailVerified) {
      toast.error("Please verify your email before adding to cart")
      return
    }
    if (!product) return
    setAddingToCart(true)
    try {
      const cartRef = collection(db, "users", user.uid, "cart")
      const q = query(cartRef, where("productId", "==", product.id))
      const existing = await getDocs(q)
      if (!existing.empty) {
        toast.info("Product already in cart")
        setAddingToCart(false)
        return
      }
      const cartItem: Omit<CartItem, "quantity"> & { quantity: number } = {
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || "",
        price: product.hasDiscount ? product.discountPrice : product.normalPrice,
        quantity: 1,
        selectedImages: selectedImages.length > 0 ? selectedImages : [],
      }
      await addDoc(cartRef, cartItem)
      toast.success("Added to cart!")
    } catch {
      toast.error("Failed to add to cart")
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
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

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">Product not found</p>
          <Link href="/" className="text-primary hover:underline">Go back to home</Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1">
            <div className="mb-3 aspect-square w-full overflow-hidden rounded-xl bg-muted">
              {product.images[selectedImage] ? (
                <img
                  src={product.images[selectedImage] || "/placeholder.svg"}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">No Image</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${selectedImage === idx ? "border-primary" : "border-border"}`}
                  >
                    <img src={img || "/placeholder.svg"} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover" />
                    {selectedImages.includes(img) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {product.images.length > 1 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Click images to select specific ones you want (optional):</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleImageSelection(img)}
                      className={`rounded-md px-2 py-1 text-xs ${selectedImages.includes(img) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {`Image ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">{product.name}</h1>
            <p className="mt-2 text-muted-foreground">{product.description}</p>

            <div className="mt-4 flex items-center gap-3">
              {product.hasDiscount ? (
                <>
                  <span className="text-3xl font-bold text-primary">
                    {"\u20A6"}{product.discountPrice.toLocaleString()}
                  </span>
                  <span className="text-xl text-muted-foreground line-through">
                    {"\u20A6"}{product.normalPrice.toLocaleString()}
                  </span>
                  <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-sm font-semibold text-destructive">
                    {`Save ${Math.round(((product.normalPrice - product.discountPrice) / product.normalPrice) * 100)}%`}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {"\u20A6"}{product.normalPrice.toLocaleString()}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {addingToCart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Add to Cart
              </button>
              <button
                onClick={handleLike}
                className={`flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold transition-colors ${
                  isLiked
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-destructive" : ""}`} />
                {isLiked ? "Liked" : "Like"}
                <span className="text-muted-foreground">({product.likes || 0})</span>
              </button>
            </div>

            {product.limitedToStates.length > 0 && (
              <div className="mt-4 rounded-lg bg-accent p-3">
                <p className="text-xs font-medium text-accent-foreground">Available in:</p>
                <p className="mt-1 text-sm text-muted-foreground">{product.limitedToStates.join(", ")}</p>
              </div>
            )}

            {product.fullDetails && (
              <div className="mt-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">Product Details</h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {product.fullDetails}
                </div>
              </div>
            )}

            {product.externalLinks && product.externalLinks.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">External Links</h3>
                <div className="flex flex-col gap-2">
                  {product.externalLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
