"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { db, collection, getDocs, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from "@/lib/firebase"
import { uploadToImgBB } from "@/lib/imgbb"
import type { Product } from "@/lib/types"
import { NIGERIA_STATES } from "@/lib/types"
import { Loader2, Plus, Eye, Edit3, Trash2, X, Upload, ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface ProductForm {
  name: string
  description: string
  fullDetails: string
  images: string[]
  normalPrice: number
  discountPrice: number
  hasDiscount: boolean
  externalLinks: string[]
  limitedToStates: string[]
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  fullDetails: "",
  images: [],
  normalPrice: 0,
  discountPrice: 0,
  hasDiscount: false,
  externalLinks: [],
  limitedToStates: [],
}

export default function AdminProductsPage(): React.ReactElement {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [newLink, setNewLink] = useState("")
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<"form" | "preview">("form")
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, "products"))
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product))
    } catch {
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setForm(emptyForm)
    setEditingProduct(null)
    setStep("form")
    setShowModal(true)
  }

  const openEditModal = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description,
      fullDetails: product.fullDetails,
      images: [...product.images],
      normalPrice: product.normalPrice,
      discountPrice: product.discountPrice,
      hasDiscount: product.hasDiscount,
      externalLinks: [...(product.externalLinks || [])],
      limitedToStates: [...(product.limitedToStates || [])],
    })
    setEditingProduct(product)
    setStep("form")
    setShowModal(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToImgBB(files[i])
        uploaded.push(url)
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }))
      toast.success(`${uploaded.length} image(s) uploaded`)
    } catch {
      toast.error("Failed to upload image(s)")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const removeImage = (idx: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
  }

  const addLink = () => {
    if (!newLink.trim()) return
    setForm((prev) => ({ ...prev, externalLinks: [...prev.externalLinks, newLink.trim()] }))
    setNewLink("")
  }

  const removeLink = (idx: number) => {
    setForm((prev) => ({ ...prev, externalLinks: prev.externalLinks.filter((_, i) => i !== idx) }))
  }

  const toggleState = (state: string) => {
    setForm((prev) => ({
      ...prev,
      limitedToStates: prev.limitedToStates.includes(state)
        ? prev.limitedToStates.filter((s) => s !== state)
        : [...prev.limitedToStates, state],
    }))
  }

  const validateForm = () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return false }
    if (!form.description.trim()) { toast.error("Description is required"); return false }
    if (form.images.length === 0) { toast.error("At least 1 image is required"); return false }
    if (form.normalPrice <= 0) { toast.error("Normal price must be greater than 0"); return false }
    if (form.hasDiscount && form.discountPrice <= 0) { toast.error("Discount price must be greater than 0"); return false }
    if (form.hasDiscount && form.discountPrice >= form.normalPrice) { toast.error("Discount price must be less than normal price"); return false }
    return true
  }

  const handleProceed = () => {
    if (!validateForm()) return
    setStep("preview")
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const productData = {
        name: form.name,
        description: form.description,
        fullDetails: form.fullDetails,
        images: form.images,
        normalPrice: form.normalPrice,
        discountPrice: form.hasDiscount ? form.discountPrice : 0,
        hasDiscount: form.hasDiscount,
        externalLinks: form.externalLinks,
        limitedToStates: form.limitedToStates,
      }

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), productData)
        setProducts((prev) => prev.map((p) =>
          p.id === editingProduct.id ? { ...p, ...productData } : p
        ))
        toast.success("Product updated!")
      } else {
        const docRef = await addDoc(collection(db, "products"), {
          ...productData,
          likes: 0,
          createdAt: serverTimestamp(),
        })
        setProducts((prev) => [{ id: docRef.id, ...productData, likes: 0, createdAt: null } as Product, ...prev])
        toast.success("Product added!")
      }
      setShowModal(false)
    } catch {
      toast.error("Failed to save product")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return
    setDeleting(productId)
    try {
      await deleteDoc(doc(db, "products", productId))
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      toast.success("Product deleted")
    } catch {
      toast.error("Failed to delete product")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Products ({products.length})</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No products yet. Add your first product!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {product.images[0] ? (
                  <img src={product.images[0] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">No Image</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="mb-1 font-semibold text-foreground">{product.name}</h3>
                <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                <div className="mb-3 flex items-center gap-2">
                  {product.hasDiscount ? (
                    <>
                      <span className="font-bold text-primary">{"\u20A6"}{product.discountPrice.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground line-through">{"\u20A6"}{product.normalPrice.toLocaleString()}</span>
                    </>
                  ) : (
                    <span className="font-bold text-primary">{"\u20A6"}{product.normalPrice.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingProduct(product)}
                    className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/80"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  <button
                    onClick={() => openEditModal(product)}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deleting === product.id}
                    className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleting === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="animate-fadeIn max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {step === "preview" ? "Confirm Product" : editingProduct ? "Edit Product" : "Add Product"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            {step === "form" ? (
              <div className="flex flex-col gap-4">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Product Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    placeholder="Enter product name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    placeholder="Short description"
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Images</label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                        <img src={img || "/placeholder.svg"} alt={`Product ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          <span className="text-[10px]">Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Normal Price ({"\u20A6"})</label>
                    <input
                      type="number"
                      value={form.normalPrice || ""}
                      onChange={(e) => setForm({ ...form, normalPrice: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <label className="text-sm font-medium text-foreground">Discount Price ({"\u20A6"})</label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={form.hasDiscount}
                          onChange={(e) => setForm({ ...form, hasDiscount: e.target.checked })}
                          className="h-4 w-4 rounded accent-primary"
                        />
                        <span className="text-xs text-muted-foreground">Has discount</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      value={form.discountPrice || ""}
                      onChange={(e) => setForm({ ...form, discountPrice: Number(e.target.value) })}
                      disabled={!form.hasDiscount}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Full Details */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Full Details</label>
                  <textarea
                    value={form.fullDetails}
                    onChange={(e) => setForm({ ...form, fullDetails: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    placeholder="Detailed product information"
                  />
                </div>

                {/* External Links */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">External Links (optional)</label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {form.externalLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
                        <span className="max-w-[200px] truncate">{link}</span>
                        <button onClick={() => removeLink(idx)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      placeholder="https://example.com"
                    />
                    <button onClick={addLink} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/80">Add</button>
                  </div>
                </div>

                {/* Limited To States */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Limited To States (optional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {NIGERIA_STATES.map((state) => (
                      <button
                        key={state}
                        onClick={() => toggleState(state)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          form.limitedToStates.includes(state)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProceed}
                  className="mt-2 flex items-center justify-center rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Proceed
                </button>
              </div>
            ) : (
              /* Preview Step */
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex gap-2 overflow-x-auto">
                    {form.images.map((img, idx) => (
                      <img key={idx} src={img || "/placeholder.svg"} alt={`Preview ${idx + 1}`} className="h-20 w-20 flex-shrink-0 rounded-lg border border-border object-cover" />
                    ))}
                  </div>
                  <h4 className="text-lg font-bold text-foreground">{form.name}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {form.hasDiscount ? (
                      <>
                        <span className="text-xl font-bold text-primary">{"\u20A6"}{form.discountPrice.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground line-through">{"\u20A6"}{form.normalPrice.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-primary">{"\u20A6"}{form.normalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  {form.fullDetails && (
                    <div className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{form.fullDetails}</div>
                  )}
                  {form.externalLinks.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-foreground">External Links:</p>
                      {form.externalLinks.map((link, idx) => (
                        <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline">{link}</a>
                      ))}
                    </div>
                  )}
                  {form.limitedToStates.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      <strong>Available in:</strong> {form.limitedToStates.join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editingProduct ? "Update Product" : "Post Product"}
                  </button>
                  <button
                    onClick={() => setStep("form")}
                    className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setViewingProduct(null)}>
          <div className="animate-fadeIn max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">{viewingProduct.name}</h3>
              <button onClick={() => setViewingProduct(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {viewingProduct.images.map((img, idx) => (
                <img key={idx} src={img || "/placeholder.svg"} alt={`${viewingProduct.name} ${idx + 1}`} className="h-24 w-24 flex-shrink-0 rounded-lg border border-border object-cover" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{viewingProduct.description}</p>
            <div className="mt-2 flex items-center gap-2">
              {viewingProduct.hasDiscount ? (
                <>
                  <span className="text-xl font-bold text-primary">{"\u20A6"}{viewingProduct.discountPrice.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground line-through">{"\u20A6"}{viewingProduct.normalPrice.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-xl font-bold text-primary">{"\u20A6"}{viewingProduct.normalPrice.toLocaleString()}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{viewingProduct.likes} likes</p>
            {viewingProduct.fullDetails && (
              <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{viewingProduct.fullDetails}</div>
            )}
            {viewingProduct.limitedToStates.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                <strong>Available in:</strong> {viewingProduct.limitedToStates.join(", ")}
              </p>
            )}
            {viewingProduct.externalLinks && viewingProduct.externalLinks.length > 0 && (
              <div className="mt-3">
                {viewingProduct.externalLinks.map((link, idx) => (
                  <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline">{link}</a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
