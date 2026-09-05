'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Star,
  Share2,
  Heart,
  Download,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Video,
  ShoppingBag,
  Tag,
  Copy,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  Plus,
  Minus,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewVideoUrl, setReviewVideoUrl] = useState('');
  const [guestReviewerName, setGuestReviewerName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadProductData() {
      try {
        setLoading(true);
        const res = await api.get(`/public/products/by-slug/${slug}`);
        const prod = res.data;
        setProduct(prod);

        if (prod?.variants && prod.variants.length > 0) {
          setSelectedVariant(prod.variants[0]);
        }

        // Fetch reviews & recommendations
        const [revRes, recRes] = await Promise.all([
          api.get(`/public/products/${prod.id}/reviews`).catch(() => ({ data: [] })),
          api.get(`/public/products/${prod.id}/recommendations?limit=4`).catch(() => ({ data: [] })),
        ]);

        setReviews(revRes.data || []);
        setRecommendations(recRes.data || []);

        // Log product view event
        api.post('/public/behavior-log', {
          eventType: 'PRODUCT_VIEWED',
          productId: prod.id,
        }).catch(() => {});
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadProductData();
    }
  }, [slug]);

  // Calculate current unit price based on Quantity Stepper
  const calculatePricing = () => {
    if (!product) return { unitPrice: 0, discountPercent: 0, totalPrice: 0, savings: 0 };

    let unitPrice = product.mrp;
    let discountPercent = 0;

    if (product.quantityDiscountTiers && Array.isArray(product.quantityDiscountTiers)) {
      const tiers = [...product.quantityDiscountTiers].sort((a: any, b: any) => b.minQty - a.minQty);
      const applicable = tiers.find((t: any) => quantity >= t.minQty);
      if (applicable) {
        discountPercent = applicable.discountPercent;
        unitPrice = product.mrp * (1 - discountPercent / 100);
      }
    }

    const totalPrice = unitPrice * quantity;
    const originalTotal = product.mrp * quantity;
    const savings = originalTotal - totalPrice;

    return { unitPrice, discountPercent, totalPrice, savings };
  };

  const pricing = calculatePricing();

  const handleToggleWishlist = async () => {
    if (!user) {
      setToastMessage('Please login to save items to your wishlist.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    try {
      const res = await api.post(`/public/wishlist/${product.id}`, {});
      setIsInWishlist(res.data.isInWishlist);
      setToastMessage(res.data.message);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage('Failed to update wishlist');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setToastMessage('Link copied to clipboard! Share with colleagues or customers.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAddToCartAndCheckout = () => {
    // Store cart in sessionStorage for checkout
    const cartItem = {
      productId: product.id,
      name: product.name,
      genericName: product.genericName,
      companyName: product.companyName,
      mrp: product.mrp,
      unitPrice: pricing.unitPrice,
      quantity,
      variant: selectedVariant?.name,
      productType: product.productType,
      isCodAvailable: product.isCodAvailable,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('public_checkout_cart', JSON.stringify([cartItem]));
    }
    router.push('/checkout');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingReview(true);
      const res = await api.post('/public/reviews', {
        productId: product.id,
        rating: reviewRating,
        comment: reviewComment,
        videoUrl: reviewVideoUrl || undefined,
        guestName: guestReviewerName || undefined,
      });

      setReviews([res.data, ...reviews]);
      setShowReviewModal(false);
      setReviewComment('');
      setReviewVideoUrl('');
      setToastMessage('Thank you! Your verified review has been published.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl font-extrabold text-slate-700 font-mono">404</div>
          <h1 className="text-xl font-bold text-white">Product Not Found</h1>
          <p className="text-xs text-slate-400">
            This product is either unavailable or restricted to authorized commercial distributors.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-sky-500 text-white text-xs font-bold shadow-2xl shadow-sky-500/40 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Main Product Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Product Visuals & Badges */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 bg-slate-900/90 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-4xl mb-4 group-hover:scale-105 transition-transform">
              {product.productType === 'DIGITAL' ? <Download className="w-16 h-16" /> : <ShieldCheck className="w-16 h-16" />}
            </div>

            <div className="flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono ${
                  product.productType === 'DIGITAL'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}
              >
                {product.productType === 'DIGITAL' ? '⚡ Instant Digital Download' : '📦 Physical Delivery'}
              </span>

              {product.isCodAvailable ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ✓ COD Available
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Pre-Payment Only
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pricing, Stepper & Purchase Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider">
                {product.companyName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleWishlist}
                  className={`p-2 rounded-xl border transition-all ${
                    isInWishlist
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Save to Wishlist"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white transition-all"
                  title="Share Deep Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-white mt-1">{product.name}</h1>
            <div className="text-sm text-slate-400 font-mono mt-1">
              {product.genericName} • {product.dosageForm} ({product.strength})
            </div>

            {/* Ratings Summary */}
            <div className="flex items-center gap-2 mt-3 text-xs">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(product.averageRating || 5) ? 'fill-amber-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="font-bold text-white font-mono">{product.averageRating || '5.0'}</span>
              <span className="text-slate-500">({product.totalReviewsCount || reviews.length} verified reviews)</span>
            </div>
          </div>

          {/* Pricing Box with Quantity Discount Stepper */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs text-slate-400">Public Retail Price</span>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-3xl font-extrabold text-white font-mono">
                    ৳{pricing.unitPrice.toFixed(2)}
                  </span>
                  {pricing.discountPercent > 0 && (
                    <>
                      <span className="text-sm text-slate-500 line-through font-mono">
                        ৳{product.mrp.toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {pricing.discountPercent}% OFF Tier
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">{product.unit}</span>
            </div>

            {/* Quantity Stepper Table Directly on Product Page */}
            {product.quantityDiscountTiers && product.quantityDiscountTiers.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  <span>Quantity Volume Discount Stepper:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {product.quantityDiscountTiers.map((tier: any, index: number) => (
                    <div
                      key={index}
                      onClick={() => setQuantity(tier.minQty)}
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        quantity >= tier.minQty
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono">{tier.minQty}+ Units</div>
                      <div className="text-[11px] text-emerald-400 font-bold">{tier.discountPercent}% Savings</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-300">Select Quantity:</span>
              <div className="flex items-center gap-3 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-mono font-bold text-white text-sm">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Total and Checkout Action */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400">Total Calculated</span>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  ৳{pricing.totalPrice.toFixed(2)}
                  {pricing.savings > 0 && (
                    <span className="text-xs text-emerald-300 font-normal ml-2">
                      (Saved ৳{pricing.savings.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleAddToCartAndCheckout}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-sm shadow-xl shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                {product.productType === 'DIGITAL' ? 'Buy & Download Instant PDF' : 'Order Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Video Uploads Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Customer Reviews & Experiences</h2>
            <p className="text-xs text-slate-400">Real verified customer feedback with photos and unboxing videos.</p>
          </div>

          <button
            onClick={() => setShowReviewModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Write a Review
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-3xl">
            No reviews submitted yet. Be the first verified customer to share your feedback!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2 text-xs">
                      {rev.reviewerName}
                      {rev.isVerifiedPurchase && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex text-amber-400 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < rev.rating ? 'fill-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>

                {rev.videoUrl && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-2 text-sky-400">
                    <Video className="w-4 h-4" />
                    <a
                      href={rev.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-mono text-[11px] truncate"
                    >
                      Watch Customer Video Experience ({rev.videoUrl})
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* "You Might Also Like" Recommendation Carousel */}
      {recommendations.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>You Might Also Like</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                href={`/products/${rec.slug}`}
                className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-sky-500/40 transition-all group space-y-2"
              >
                <div className="font-bold text-white text-xs group-hover:text-sky-300 transition-colors">
                  {rec.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{rec.genericName}</div>
                <div className="flex justify-between items-center pt-2 text-xs font-mono font-bold text-sky-400">
                  <span>৳{rec.mrp}</span>
                  <span className="text-[10px] text-slate-500">{rec.companyName}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Submit Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReview}
            className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-700 bg-slate-900 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Write a Product Review</h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-2 rounded-xl border ${
                        reviewRating >= star
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {!user && (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={guestReviewerName}
                    onChange={(e) => setGuestReviewerName(e.target.value)}
                    placeholder="e.g. Asif Rahman"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-sans"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-300 font-bold block mb-1">Your Feedback</label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details of your experience, effectiveness, packaging..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white resize-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Video Review URL (Optional)</label>
                <input
                  type="url"
                  value={reviewVideoUrl}
                  onChange={(e) => setReviewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20 disabled:opacity-50"
              >
                {submittingReview ? 'Publishing...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
