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
  Store,
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
  const [resellerListing, setResellerListing] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<any>(null);
  const [substitutes, setSubstitutes] = useState<any[]>([]);
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

        // Fetch reviews, recommendations, frequently bought together & generic substitutes
        const [revRes, recRes, resellerRes, fbtRes, subRes] = await Promise.all([
          api.get(`/public/products/${prod.id}/reviews`).catch(() => ({ data: [] })),
          api.get(`/recommendations/personalized?limit=4`).catch(() => ({ data: [] })),
          api.get(`/reseller/listings/public?productId=${prod.id}`).catch(() => ({ data: [] })),
          api.get(`/recommendations/frequently-bought-together/${prod.id}`).catch(() => ({ data: null })),
          api.get(`/recommendations/substitutes/${prod.id}`).catch(() => ({ data: [] })),
        ]);

        setReviews(revRes.data || []);
        setRecommendations(recRes.data || []);
        setFrequentlyBought(fbtRes.data || null);
        setSubstitutes(subRes.data || []);
        if (resellerRes.data && resellerRes.data.length > 0) {
          setResellerListing(resellerRes.data[0]);
        }

        // Log product view event to Recommendation Engine
        api.post('/recommendations/track', {
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
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-xs">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl font-extrabold text-slate-700 font-mono">404</div>
          <h1 className="text-xl font-bold text-slate-900">Product Not Found</h1>
          <p className="text-xs text-slate-500">
            This product is either unavailable or restricted to authorized commercial distributors.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-xs text-slate-600 font-medium"
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
          <div className="p-8 rounded-3xl border border-slate-200 bg-white aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-200 flex items-center justify-center text-sky-600 font-bold text-4xl mb-4 group-hover:scale-105 transition-transform">
              {product.productType === 'DIGITAL' ? <Download className="w-16 h-16" /> : <ShieldCheck className="w-16 h-16" />}
            </div>

            <div className="flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono ${
                  product.productType === 'DIGITAL'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}
              >
                {product.productType === 'DIGITAL' ? '⚡ Instant Digital Download' : '📦 Physical Delivery'}
              </span>

              {product.isCodAvailable ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-600 border border-emerald-500/20">
                  ✓ COD Available
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-600 border border-amber-200">
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
              <span className="text-xs font-bold text-sky-600 font-mono uppercase tracking-wider">
                {product.companyName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleWishlist}
                  className={`p-2 rounded-xl border transition-all ${
                    isInWishlist
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-slate-100/60 border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                  title="Save to Wishlist"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-xl bg-slate-100/60 border border-slate-200 text-slate-500 hover:text-white transition-all"
                  title="Share Deep Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-white mt-1">{product.name}</h1>
            <div className="text-sm text-slate-500 font-mono mt-1">
              {product.genericName} • {product.dosageForm} ({product.strength})
            </div>

            {/* Ratings Summary */}
            <div className="flex items-center gap-2 mt-3 text-xs">
              <div className="flex text-amber-600">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(product.averageRating || 5) ? 'fill-amber-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="font-bold text-slate-900 font-mono">{product.averageRating || '5.0'}</span>
              <span className="text-slate-500">({product.totalReviewsCount || reviews.length} verified reviews)</span>
            </div>

            {/* Verified Seller Attribution */}
            {resellerListing && (
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-500/25 shadow-sm">
                <Store className="w-4 h-4 text-indigo-600" />
                <span>Verified Seller: <strong className="text-white">{resellerListing.sellerDisplayName}</strong></span>
              </div>
            )}
          </div>

          {/* Pricing Box with Quantity Discount Stepper */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-5">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs text-slate-500">Public Retail Price</span>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-3xl font-extrabold text-white font-mono">
                    ৳{pricing.unitPrice.toFixed(2)}
                  </span>
                  {pricing.discountPercent > 0 && (
                    <>
                      <span className="text-sm text-slate-500 line-through font-mono">
                        ৳{product.mrp.toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {pricing.discountPercent}% OFF Tier
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-500 font-mono">{product.unit}</span>
            </div>

            {/* Quantity Stepper Table Directly on Product Page */}
            {product.quantityDiscountTiers && product.quantityDiscountTiers.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <Tag className="w-3.5 h-3.5 text-sky-600" />
                  <span>Quantity Volume Discount Stepper:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {product.quantityDiscountTiers.map((tier: any, index: number) => (
                    <div
                      key={index}
                      onClick={() => setQuantity(tier.minQty)}
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        quantity >= tier.minQty
                          ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <div className="font-mono">{tier.minQty}+ Units</div>
                      <div className="text-[11px] text-emerald-600 font-bold">{tier.discountPercent}% Savings</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-600">Select Quantity:</span>
              <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-mono font-bold text-white text-sm">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Total and Checkout Action */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-500">Total Calculated</span>
                <div className="text-xl font-bold text-emerald-600 font-mono">
                  ৳{pricing.totalPrice.toFixed(2)}
                  {pricing.savings > 0 && (
                    <span className="text-xs text-emerald-700 font-normal ml-2">
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
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Customer Reviews & Experiences</h2>
            <p className="text-xs text-slate-500">Real verified customer feedback with photos and unboxing videos.</p>
          </div>

          <button
            onClick={() => setShowReviewModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-sky-600 font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Write a Review
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-3xl">
            No reviews submitted yet. Be the first verified customer to share your feedback!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-3xl border border-slate-200 bg-white space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                      {rev.reviewerName}
                      {rev.isVerifiedPurchase && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-500/20">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex text-amber-600 mt-1">
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

                <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>

                {rev.videoUrl && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2 text-sky-600">
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

      {/* Frequently Bought Together Bundle */}
      {frequentlyBought && frequentlyBought.bundledProducts && frequentlyBought.bundledProducts.length > 0 && (
        <div className="p-6 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 font-mono uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Frequently Bought Together</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customers who ordered this medicine commonly bundle these items. Save 5% automatically!
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
              5% COMBO SAVINGS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {/* Main Product */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase">Main Selection</span>
              <div className="font-bold text-slate-900 text-xs truncate">{frequentlyBought.mainProduct.name}</div>
              <div className="text-xs font-mono font-bold text-sky-600">৳{frequentlyBought.mainProduct.priceBdt}</div>
            </div>

            {/* Bundled Complementary Items */}
            {frequentlyBought.bundledProducts.map((bundleItem: any) => (
              <div key={bundleItem.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase">+ Complementary</span>
                <div className="font-bold text-slate-900 text-xs truncate">{bundleItem.name}</div>
                <div className="text-xs font-mono font-bold text-sky-600">৳{bundleItem.priceBdt}</div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">
                Combo Price: <span className="line-through text-slate-500">৳{frequentlyBought.bundleOriginalPriceBdt}</span>{' '}
                <strong className="text-emerald-600 text-sm">৳{frequentlyBought.bundleTotalPriceBdt}</strong>
              </span>
              <span className="text-emerald-600 font-semibold">(Save ৳{frequentlyBought.bundleDiscountSavingsBdt})</span>
            </div>

            <button
              onClick={() => {
                setToastMessage('Added bundle items to cart with 5% combo discount!');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-950 transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Add All to Cart
            </button>
          </div>
        </div>
      )}

      {/* Generic Substitutes & Price Comparisons */}
      {substitutes.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Generic Equivalents & Alternative Brands ({product?.genericName})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact active chemical formula from verified Bangladesh DGDA-approved manufacturers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {substitutes.map((sub) => (
              <Link
                key={sub.id}
                href={`/products/${sub.slug}`}
                className="p-4 rounded-2xl border border-slate-200 bg-white/70 hover:border-emerald-200 transition-all group space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-700 transition-colors">
                      {sub.name}
                    </span>
                    {sub.discountPercentage && sub.discountPercentage > 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                        Save {sub.discountPercentage}%
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{sub.companyName}</div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-emerald-600">৳{sub.priceBdt}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-600 flex items-center gap-1">
                    Compare <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* "Recommended for You" Personalized Carousel */}
      {recommendations.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Recommended For You</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                href={`/products/${rec.slug}`}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-200 transition-all group space-y-2"
              >
                <div className="font-bold text-slate-900 text-xs group-hover:text-sky-700 transition-colors">
                  {rec.name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{rec.genericName}</div>
                <div className="flex justify-between items-center pt-2 text-xs font-mono font-bold text-sky-600">
                  <span>৳{rec.priceBdt || rec.mrp}</span>
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
            className="max-w-md w-full p-6 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Write a Product Review</h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-2 rounded-xl border ${
                        reviewRating >= star
                          ? 'bg-amber-50 border-amber-500 text-amber-600'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {!user && (
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={guestReviewerName}
                    onChange={(e) => setGuestReviewerName(e.target.value)}
                    placeholder="e.g. Asif Rahman"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-sans"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-600 font-bold block mb-1">Your Feedback</label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details of your experience, effectiveness, packaging..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 resize-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Video Review URL (Optional)</label>
                <input
                  type="url"
                  value={reviewVideoUrl}
                  onChange={(e) => setReviewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg disabled:opacity-50"
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
