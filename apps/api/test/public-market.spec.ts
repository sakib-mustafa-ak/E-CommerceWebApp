import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PublicService } from '../src/modules/public/public.service';
import { AccountType } from '@siam-aqua/shared-types';

describe('Phase 6: Public Market, Checkout & Digital Assets Integration Test Suite', () => {
  let prisma: PrismaClient;
  let publicService: PublicService;

  let publicUser: any;
  let testCompany: any;
  let physicalProduct: any;
  let codDisabledProduct: any;
  let digitalProduct: any;
  let quantityTierProduct: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    publicService = new PublicService(prisma as any);

    const suffix = Date.now();

    // Setup Test Company
    testCompany = await prisma.company.upsert({
      where: { code: `PUBLIC_PHARMA_${suffix}` },
      update: {},
      create: {
        code: `PUBLIC_PHARMA_${suffix}`,
        name: `Public Pharma Consumer Care ${suffix}`,
      },
    });

    // Setup Public User
    publicUser = await prisma.user.create({
      data: {
        email: `public_shopper_${suffix}@gmail.com`,
        passwordHash: 'dummy_hash',
        name: 'Tanvir Ahmed Public Shopper',
        accountType: AccountType.PUBLIC_USER,
      },
    });

    // Setup Physical Product (with COD enabled)
    physicalProduct = await prisma.product.create({
      data: {
        name: `Ace Plus 500mg/65mg ${suffix}`,
        slug: `ace-plus-${suffix}`,
        genericName: 'Paracetamol + Caffeine',
        companyId: testCompany.id,
        dosageForm: 'Tablet',
        strength: '500mg + 65mg',
        mrp: 40.0,
        unit: 'Strip (10 tabs)',
        category: 'OTC',
        productType: 'PHYSICAL',
        isCodAvailable: true,
      },
    });

    // Setup COD-Disabled Physical Product (Pre-payment only)
    codDisabledProduct = await prisma.product.create({
      data: {
        name: `High Value Specialized Injectable ${suffix}`,
        slug: `specialized-injectable-${suffix}`,
        genericName: 'Specialized Bio-Compound',
        companyId: testCompany.id,
        dosageForm: 'Injection',
        strength: '100mg/ml',
        mrp: 3500.0,
        unit: 'Vial',
        category: 'Surgical',
        productType: 'PHYSICAL',
        isCodAvailable: false, // COD strictly disabled
      },
    });

    // Setup Digital Product (E-book / Clinical Guide)
    digitalProduct = await prisma.product.create({
      data: {
        name: `Digital Clinical Guideline E-Book ${suffix}`,
        slug: `clinical-guidelines-ebook-${suffix}`,
        genericName: 'Digital Clinical Guide',
        companyId: testCompany.id,
        dosageForm: 'Digital PDF',
        strength: 'v2026.1',
        mrp: 450.0,
        unit: 'Digital Download',
        category: 'Digital',
        productType: 'DIGITAL',
        digitalFileUrl: 'https://storage.siamaqua.com/ebooks/clinical-guide-2026.pdf',
        digitalDownloadLimit: 3, // Max 3 downloads
        digitalExpiryHours: 24, // 24 hours expiry
        isCodAvailable: false,
      },
    });

    // Setup Product with Quantity Discount Steppers
    // Steppers: 5+ units: 5% off, 10+ units: 10% off, 20+ units: 15% off
    quantityTierProduct = await prisma.product.create({
      data: {
        name: `Vitamin C 500mg Chewable ${suffix}`,
        slug: `vitamin-c-chewable-${suffix}`,
        genericName: 'Ascorbic Acid',
        companyId: testCompany.id,
        dosageForm: 'Chewable Tablet',
        strength: '500mg',
        mrp: 100.0,
        unit: 'Bottle (30 tabs)',
        category: 'OTC',
        productType: 'PHYSICAL',
        isCodAvailable: true,
        quantityDiscountTiers: JSON.stringify([
          { minQty: 5, discountPercent: 5 },
          { minQty: 10, discountPercent: 10 },
          { minQty: 20, discountPercent: 15 },
        ]),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST 1: Authenticated & Guest Checkout
  it('1. Should allow both authenticated public users and guest checkout without an account', async () => {
    // A: Authenticated Checkout
    const authCheckout = await publicService.checkout(
      {
        items: [{ productId: physicalProduct.id, quantity: 2 }],
        fulfillmentMethod: 'HOME_DELIVERY',
        deliveryAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
        paymentMethod: 'COD',
      },
      publicUser.id,
    );

    expect(authCheckout.orderNumber).toMatch(/^ORD-PUB-/);
    expect(authCheckout.totalAmount).toBe(2 * 40.0 + 60); // 80 + 60 delivery
    expect(authCheckout.orderType).toBe('PHYSICAL');

    const authOrderInDb = await prisma.order.findUnique({
      where: { id: authCheckout.orderId },
    });
    expect(authOrderInDb?.userId).toBe(publicUser.id);
    expect(authOrderInDb?.isGuestOrder).toBe(false);

    // B: Guest Checkout (No userId)
    const guestCheckout = await publicService.checkout({
      items: [{ productId: physicalProduct.id, quantity: 3 }],
      isGuest: true,
      guestName: 'Kazi Farhan (Guest)',
      guestEmail: 'farhan.guest@gmail.com',
      guestPhone: '01712345678',
      fulfillmentMethod: 'HOME_DELIVERY',
      deliveryAddress: 'Banani Block C, Dhaka',
      paymentMethod: 'COD',
    });

    expect(guestCheckout.orderNumber).toMatch(/^ORD-PUB-/);
    const guestOrderInDb = await prisma.order.findUnique({
      where: { id: guestCheckout.orderId },
    });
    expect(guestOrderInDb?.userId).toBeNull();
    expect(guestOrderInDb?.isGuestOrder).toBe(true);
    expect(guestOrderInDb?.guestName).toBe('Kazi Farhan (Guest)');
    expect(guestOrderInDb?.guestEmail).toBe('farhan.guest@gmail.com');
  });

  // TEST 2: Quantity Discount Steppers
  it('2. Should correctly apply dynamic quantity discount steppers on retail base MRP', async () => {
    // Product MRP = 100.0
    // Buying 10 units => triggers 10% tier => Unit price 90.0
    // Total original subtotal = 1000.0, discount = 100.0, final subtotal = 900.0 + 60 delivery = 960.0
    const tieredCheckout = await publicService.checkout({
      items: [{ productId: quantityTierProduct.id, quantity: 10 }],
      fulfillmentMethod: 'HOME_DELIVERY',
      deliveryAddress: 'Uttara Sector 4, Dhaka',
      paymentMethod: 'COD',
    });

    expect(tieredCheckout.subtotal).toBe(1000.0);
    expect(tieredCheckout.discountAmount).toBe(100.0);
    expect(tieredCheckout.totalAmount).toBe(960.0);

    // Buying 20 units => triggers 15% tier => Unit price 85.0
    // Total original subtotal = 2000.0, discount = 300.0, final subtotal = 1700.0 + 60 delivery = 1760.0
    const tieredCheckout20 = await publicService.checkout({
      items: [{ productId: quantityTierProduct.id, quantity: 20 }],
      fulfillmentMethod: 'HOME_DELIVERY',
      deliveryAddress: 'Uttara Sector 4, Dhaka',
      paymentMethod: 'COD',
    });

    expect(tieredCheckout20.subtotal).toBe(2000.0);
    expect(tieredCheckout20.discountAmount).toBe(300.0);
    expect(tieredCheckout20.totalAmount).toBe(1760.0);
  });

  // TEST 3: Per-Product COD Rule Validation
  it('3. Should reject COD when cart contains a product marked with COD disabled', async () => {
    // Trying to order COD-disabled product with COD payment method
    await expect(
      publicService.checkout({
        items: [{ productId: codDisabledProduct.id, quantity: 1 }],
        fulfillmentMethod: 'HOME_DELIVERY',
        deliveryAddress: 'Mirpur DOHS, Dhaka',
        paymentMethod: 'COD',
      }),
    ).rejects.toThrow(/does not support Cash on Delivery/);

    // Same product with digital BKASH payment method succeeds cleanly
    const digitalPayCheckout = await publicService.checkout({
      items: [{ productId: codDisabledProduct.id, quantity: 1 }],
      fulfillmentMethod: 'HOME_DELIVERY',
      deliveryAddress: 'Mirpur DOHS, Dhaka',
      paymentMethod: 'BKASH',
    });

    expect(digitalPayCheckout.orderNumber).toBeDefined();
    expect(digitalPayCheckout.totalAmount).toBe(3500.0 + 60);
  });

  // TEST 4: Digital Product Checkout & Secure Download Limits & Expiry
  it('4. Should issue instant digital download token and strictly enforce download limit and expiry', async () => {
    // Order digital ebook (no physical delivery address required, delivery fee = 0)
    const digitalCheckout = await publicService.checkout(
      {
        items: [{ productId: digitalProduct.id, quantity: 1 }],
        fulfillmentMethod: 'DIGITAL_DOWNLOAD',
        paymentMethod: 'BKASH',
      },
      publicUser.id,
    );

    expect(digitalCheckout.orderType).toBe('DIGITAL');
    expect(digitalCheckout.deliveryFee).toBe(0);
    expect(digitalCheckout.totalAmount).toBe(450.0);
    expect(digitalCheckout.digitalDownloadTokens?.length).toBe(1);

    const token = digitalCheckout.digitalDownloadTokens![0].token;
    expect(token).toBeDefined();

    // Check token info
    const tokenInfo = await publicService.getDigitalTokenInfo(token);
    expect(tokenInfo.maxDownloads).toBe(3);
    expect(tokenInfo.downloadCount).toBe(0);
    expect(tokenInfo.remainingDownloads).toBe(3);
    expect(tokenInfo.isExpired).toBe(false);

    // Download 1
    const d1 = await publicService.downloadDigitalProduct(token);
    expect(d1.downloadCount).toBe(1);
    expect(d1.remainingDownloads).toBe(2);

    // Download 2
    const d2 = await publicService.downloadDigitalProduct(token);
    expect(d2.downloadCount).toBe(2);
    expect(d2.remainingDownloads).toBe(1);

    // Download 3 (Reaches max limit = 3)
    const d3 = await publicService.downloadDigitalProduct(token);
    expect(d3.downloadCount).toBe(3);
    expect(d3.remainingDownloads).toBe(0);

    // Download 4 (Should be BLOCKED with 403 Forbidden)
    await expect(publicService.downloadDigitalProduct(token)).rejects.toThrow(
      /Maximum download limit \(3 downloads\) reached/,
    );

    // Test Expiration: Create expired token directly in DB
    const expiredToken = await prisma.digitalDownloadToken.create({
      data: {
        token: `expired_token_${Date.now()}`,
        orderId: digitalCheckout.orderId,
        productId: digitalProduct.id,
        userId: publicUser.id,
        maxDownloads: 5,
        downloadCount: 0,
        expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      },
    });

    await expect(publicService.downloadDigitalProduct(expiredToken.token)).rejects.toThrow(
      /download link has expired/,
    );
  });

  // TEST 5: Advance Delivery Deposit Logic for High-Value Orders
  it('5. Should require advance delivery deposit for high-value orders (>= ৳5,000)', async () => {
    // 2 x ৳3,500 = ৳7,000 (exceeds ৳5,000 threshold)
    const highValueCheckout = await publicService.checkout({
      items: [{ productId: codDisabledProduct.id, quantity: 2 }],
      fulfillmentMethod: 'HOME_DELIVERY',
      deliveryAddress: 'Gulshan 2, Dhaka',
      paymentMethod: 'BKASH',
    });

    expect(highValueCheckout.isAdvanceDepositRequired).toBe(true);
    expect(highValueCheckout.advanceDepositRequired).toBe(3000);
  });

  // TEST 6: Customer Reviews with Star Rating & Average Rating Recalculation
  it('6. Should accept product reviews with video URLs and recalculate product average rating', async () => {
    const review1 = await publicService.addProductReview(publicUser.id, {
      productId: physicalProduct.id,
      rating: 5,
      comment: 'Excellent pain relief medicine. Original packaging with hologram.',
      videoUrl: 'https://youtube.com/watch?v=sample_review_1',
    });

    expect(review1.rating).toBe(5);
    expect(review1.isVerifiedPurchase).toBe(true);
    expect(review1.videoUrl).toBe('https://youtube.com/watch?v=sample_review_1');

    // Guest review
    const review2 = await publicService.addProductReview(undefined, {
      productId: physicalProduct.id,
      rating: 4,
      comment: 'Fast acting, good experience overall.',
      guestName: 'Guest Reviewer',
    });

    expect(review2.rating).toBe(4);

    // Product average rating should now be (5 + 4) / 2 = 4.5
    const updatedProduct = await prisma.product.findUnique({
      where: { id: physicalProduct.id },
    });
    expect(updatedProduct?.averageRating).toBe(4.5);
    expect(updatedProduct?.totalReviewsCount).toBe(2);

    const reviewsList = await publicService.getProductReviews(physicalProduct.id);
    expect(reviewsList.length).toBe(2);
  });

  // TEST 7: Wishlist Restock Tracker
  it('7. Should toggle wishlist items and track live stock status', async () => {
    const addRes = await publicService.toggleWishlist(publicUser.id, physicalProduct.id);
    expect(addRes.isInWishlist).toBe(true);

    const wishlist = await publicService.getWishlist(publicUser.id);
    expect(wishlist.length).toBe(1);
    expect(wishlist[0].productId).toBe(physicalProduct.id);
    expect(wishlist[0].isInStock).toBe(true);

    // Toggle off
    const removeRes = await publicService.toggleWishlist(publicUser.id, physicalProduct.id);
    expect(removeRes.isInWishlist).toBe(false);

    const emptyWishlist = await publicService.getWishlist(publicUser.id);
    expect(emptyWishlist.length).toBe(0);
  });

  // TEST 8: Deep-Linking & Stealth Boundaries
  it('8. Should return public product details with stealth boundaries', async () => {
    const productDetail = await publicService.getProductBySlugStealth(
      physicalProduct.slug,
      AccountType.PUBLIC_USER,
    );

    expect(productDetail.name).toBe(physicalProduct.name);
    expect(productDetail.isCodAvailable).toBe(true);
    expect(productDetail.averageRating).toBe(4.5);

    // Non-existent slug returns 404
    await expect(
      publicService.getProductBySlugStealth('non-existent-product-slug'),
    ).rejects.toThrow(/Product not found/);
  });
});
