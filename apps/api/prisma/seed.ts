import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Siam\'s Aqua E-Commerce MedEx Pharmaceutical Database...');

  // 1. Clear previous data in proper sequence
  await prisma.auditLog.deleteMany({});
  await prisma.pharmaTrackShortList.deleteMany({});
  await prisma.platformSetting.deleteMany({});
  await prisma.rewardTransaction.deleteMany({});
  await prisma.rewardAccount.deleteMany({});
  await prisma.flashSaleDeal.deleteMany({});
  await prisma.productBundleDeal.deleteMany({});
  await prisma.abandonedCartSession.deleteMany({});
  await prisma.priceDropSubscription.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.bulkQuotationItem.deleteMany({});
  await prisma.bulkQuotationRequest.deleteMany({});
  await prisma.returnItem.deleteMany({});
  await prisma.returnRequest.deleteMany({});
  await prisma.stockSaleItem.deleteMany({});
  await prisma.stockSaleRecord.deleteMany({});
  await prisma.stockBatch.deleteMany({});
  await prisma.mpoProductSelection.deleteMany({});
  await prisma.mpoListing.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.digitalDownloadToken.deleteMany({});
  await prisma.wholesalerPublicListing.deleteMany({});
  await prisma.resellerCommissionLedgerEntry.deleteMany({});
  await prisma.resellerMonthlyStatement.deleteMany({});
  await prisma.preOrder.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.foodOrderItem.deleteMany({});
  await prisma.foodOrder.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.gameTopUpOrder.deleteMany({});
  await prisma.gameTopUpPackage.deleteMany({});
  await prisma.game.deleteMany({});
  await prisma.communityPost.deleteMany({});
  await prisma.userBehaviorLog.deleteMany({});
  await prisma.customerManualOverrideRate.deleteMany({});
  await prisma.productOverrideRate.deleteMany({});
  await prisma.companyRate.deleteMany({});
  await prisma.medicineStagingItem.deleteMany({});
  await prisma.medicineStagingBatch.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.generic.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.customerProfile.deleteMany({});
  await prisma.staffProfile.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.pricingTier.deleteMany({});
  await prisma.applicationQueue.deleteMany({});
  await prisma.ipRule.deleteMany({});
  await prisma.backupRecord.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('SiamAqua@2026', 10);

  // 2. Dynamic Permissions
  const permissionsData = [
    { slug: 'system.manage_roles', name: 'Manage Staff Roles & Matrix', category: 'system' },
    { slug: 'system.manage_backups', name: 'Trigger Backups & Restore Drills', category: 'system' },
    { slug: 'accounts.view_users', name: 'View User Accounts & Profiles', category: 'accounts' },
    { slug: 'accounts.create_accounts', name: 'Create Staff & MPO Accounts', category: 'accounts' },
    { slug: 'accounts.review_applications', name: 'Review Public Application Queue', category: 'accounts' },
    { slug: 'accounts.bulk_import', name: 'Bulk Import Customer CSV', category: 'accounts' },
    { slug: 'security.manage_ip', name: 'Manage IP Allow & Block Lists', category: 'security' },
    { slug: 'security.manage_suspensions', name: 'Suspend & Reactivate Accounts', category: 'security' },
    { slug: 'pricing.view_pricing', name: 'View Pricing Matrix & Overrides', category: 'pricing' },
    { slug: 'pricing.manage_tiers', name: 'Configure Pricing Tiers', category: 'pricing' },
    { slug: 'pricing.manage_overrides', name: 'Set Customer Manual Overrides', category: 'pricing' },
    { slug: 'catalog.view_products', name: 'View Products & Inventory', category: 'catalog' },
    { slug: 'catalog.manage_products', name: 'Create & Edit Products & Staging', category: 'catalog' },
    { slug: 'catalog.export', name: 'Export Stock Catalog CSV', category: 'catalog' },
    { slug: 'orders.view_orders', name: 'View Platform Orders', category: 'orders' },
    { slug: 'orders.fulfill', name: 'Fulfill & Dispatch Order Items', category: 'orders' },
    { slug: 'orders.export', name: 'Export Order Records CSV', category: 'orders' },
  ];

  const permissionEntities = [];
  for (const p of permissionsData) {
    const created = await prisma.permission.create({ data: p });
    permissionEntities.push(created);
  }
  const permMap = new Map(permissionEntities.map((p) => [p.slug, p.id]));

  // 3. Dynamic Roles
  const orderManagerRole = await prisma.role.create({
    data: {
      name: 'Order Manager',
      slug: 'order_manager',
      description: 'Can view and fulfill orders across sectors',
      rolePermissions: {
        create: [
          { permissionId: permMap.get('orders.view_orders')! },
          { permissionId: permMap.get('orders.fulfill')! },
          { permissionId: permMap.get('orders.export')! },
        ],
      },
    },
  });

  const wholesaleManagerRole = await prisma.role.create({
    data: {
      name: 'Wholesale & Customer Manager',
      slug: 'wholesale_customer_manager',
      description: 'Reviews public shop applications and manages tier overrides',
      rolePermissions: {
        create: [
          { permissionId: permMap.get('accounts.review_applications')! },
          { permissionId: permMap.get('accounts.view_users')! },
          { permissionId: permMap.get('pricing.view_pricing')! },
          { permissionId: permMap.get('pricing.manage_tiers')! },
          { permissionId: permMap.get('pricing.manage_overrides')! },
          { permissionId: permMap.get('accounts.bulk_import')! },
          { permissionId: permMap.get('catalog.manage_products')! },
        ],
      },
    },
  });

  // 4. Pricing Tiers
  const tierA = await prisma.pricingTier.create({
    data: {
      code: 'TIER_A',
      name: 'Tier A (High Volume / Wholesaler)',
      description: 'Primary tier for large distributors and volume partners',
      defaultRateType: 'PERCENTAGE',
      defaultValue: 15.0,
    },
  });

  const tierB = await prisma.pricingTier.create({
    data: {
      code: 'TIER_B',
      name: 'Tier B (Standard Paikari Retailer)',
      description: 'Standard discount tier for regular pharmacy shops',
      defaultRateType: 'PERCENTAGE',
      defaultValue: 10.0,
    },
  });

  const tierC = await prisma.pricingTier.create({
    data: {
      code: 'TIER_C',
      name: 'Tier C (Entry Retail / New Shop)',
      description: 'Introductory tier for small village pharmacies',
      defaultRateType: 'PERCENTAGE',
      defaultValue: 5.0,
    },
  });

  // 5. Pharmaceutical Manufacturers
  const square = await prisma.company.create({
    data: { name: 'Square Pharmaceuticals Ltd.', code: 'SQUARE' },
  });
  const beximco = await prisma.company.create({
    data: { name: 'Beximco Pharmaceuticals Ltd.', code: 'BEXIMCO' },
  });
  const incepta = await prisma.company.create({
    data: { name: 'Incepta Pharmaceuticals Ltd.', code: 'INCEPTA' },
  });
  const renata = await prisma.company.create({
    data: { name: 'Renata Limited', code: 'RENATA' },
  });
  const opsonin = await prisma.company.create({
    data: { name: 'Opsonin Pharma Ltd.', code: 'OPSONIN' },
  });
  const healthcare = await prisma.company.create({
    data: { name: 'Healthcare Pharmaceuticals Ltd.', code: 'HEALTHCARE' },
  });
  const skf = await prisma.company.create({
    data: { name: 'Eskayef Pharmaceuticals Ltd.', code: 'SKF' },
  });

  // 6. MedEx-Style Generics Monograph Database
  const genericParacetamol = await prisma.generic.create({
    data: {
      name: 'Paracetamol',
      slug: 'paracetamol',
      therapeuticClass: 'Analgesics & Antipyretics',
      indications: 'Fever, headache, toothache, earache, body pain, myalgia, dysmenorrhea, neuralgias and osteoarthritis pain.',
      dosageGuidelines: 'Adult: 500 mg to 1000 mg every 4-6 hours (max 4000 mg/day). Children: 10-15 mg/kg body weight.',
      sideEffects: 'Generally safe and well tolerated. Rare side effects include skin rash, allergic reaction, liver toxicity in overdose.',
      precautions: 'Use with caution in patients with hepatic or renal impairment and chronic alcoholism.',
      pregnancyCategory: 'B',
    },
  });

  const genericParacetamolCaffeine = await prisma.generic.create({
    data: {
      name: 'Paracetamol + Caffeine',
      slug: 'paracetamol-caffeine',
      therapeuticClass: 'Enhanced Analgesic Combination',
      indications: 'Tension headache, migraine, toothache, sore throat, feverishness and musculoskeletal aches.',
      dosageGuidelines: 'Adult: 1-2 tablets every 4 to 6 hours as needed. Maximum 8 tablets in 24 hours.',
      sideEffects: 'Mild insomnia, restlessness, palpitation if consumed with high-caffeine beverages.',
      pregnancyCategory: 'B',
    },
  });

  const genericEsomeprazole = await prisma.generic.create({
    data: {
      name: 'Esomeprazole',
      slug: 'esomeprazole',
      therapeuticClass: 'Proton Pump Inhibitors (PPI)',
      indications: 'Gastroesophageal reflux disease (GERD), erosive esophagitis, Zollinger-Ellison syndrome, H. pylori eradication.',
      dosageGuidelines: 'GERD & Ulcer: 20 mg to 40 mg once daily taken 30-60 minutes before breakfast for 4-8 weeks.',
      sideEffects: 'Headache, diarrhea, nausea, abdominal pain, flatulence, constipation.',
      pregnancyCategory: 'B',
    },
  });

  const genericAzithromycin = await prisma.generic.create({
    data: {
      name: 'Azithromycin',
      slug: 'azithromycin',
      therapeuticClass: 'Macrolide Antibiotic',
      indications: 'Upper and lower respiratory tract infections, pneumonia, sinusitis, pharyngitis, skin infections, typhoid fever.',
      dosageGuidelines: '500 mg once daily for 3-5 days, taken 1 hour before or 2 hours after meals.',
      sideEffects: 'Diarrhea, abdominal cramps, nausea, vomiting, temporary taste disturbance.',
      pregnancyCategory: 'B',
    },
  });

  const genericMontelukast = await prisma.generic.create({
    data: {
      name: 'Montelukast Sodium',
      slug: 'montelukast-sodium',
      therapeuticClass: 'Leukotriene Receptor Antagonist (Anti-Asthma)',
      indications: 'Prophylaxis and chronic treatment of asthma, relief of symptoms of allergic rhinitis (seasonal and perennial).',
      dosageGuidelines: 'Adult: 10 mg once daily in the evening.',
      sideEffects: 'Upper respiratory infection, fever, headache, pharyngitis, cough, abdominal pain.',
      pregnancyCategory: 'B',
    },
  });

  const genericCefixime = await prisma.generic.create({
    data: {
      name: 'Cefixime',
      slug: 'cefixime',
      therapeuticClass: '3rd Generation Cephalosporin Antibiotic',
      indications: 'Uncomplicated UTI, otitis media, pharyngitis, tonsillitis, acute bronchitis, typhoid fever.',
      dosageGuidelines: 'Adults: 200-400 mg daily as single dose or in two divided doses for 7-14 days.',
      sideEffects: 'Diarrhea, loose stools, nausea, abdominal pain, dyspepsia.',
      pregnancyCategory: 'B',
    },
  });

  // 7. MedEx-Style Medicine Formulations with Generic Linking
  // --- PARACETAMOL 500mg TABLETS (Competing Brands across Companies) ---
  const napa500 = await prisma.product.create({
    data: {
      name: 'Napa 500mg Tablet',
      slug: 'napa-500mg-tablet-square',
      genericId: genericParacetamol.id,
      genericName: 'Paracetamol',
      companyId: square.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 12.0, // 1.20 BDT per tab (12 BDT per strip of 10)
      unit: 'Strip (10 tabs)',
      packSize: '50 x 10\'s',
      category: 'Allopathic',
      description: 'Square\'s premier fast-acting Paracetamol formulation.',
    },
  });

  const ace500 = await prisma.product.create({
    data: {
      name: 'Ace 500mg Tablet',
      slug: 'ace-500mg-tablet-square',
      genericId: genericParacetamol.id,
      genericName: 'Paracetamol',
      companyId: square.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 12.0,
      unit: 'Strip (10 tabs)',
      packSize: '50 x 10\'s',
      category: 'Allopathic',
    },
  });

  const fast500 = await prisma.product.create({
    data: {
      name: 'Fast 500mg Tablet',
      slug: 'fast-500mg-tablet-acme',
      genericId: genericParacetamol.id,
      genericName: 'Paracetamol',
      companyId: beximco.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 10.0, // Lower priced generic alternative! (৳10 vs ৳12)
      unit: 'Strip (10 tabs)',
      packSize: '50 x 10\'s',
      category: 'Allopathic',
      description: 'Beximco economical paracetamol alternative.',
    },
  });

  const renova500 = await prisma.product.create({
    data: {
      name: 'Renova 500mg Tablet',
      slug: 'renova-500mg-tablet-opsonin',
      genericId: genericParacetamol.id,
      genericName: 'Paracetamol',
      companyId: opsonin.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 9.5, // Even lower priced alternative! (৳9.50)
      unit: 'Strip (10 tabs)',
      packSize: '50 x 10\'s',
      category: 'Allopathic',
    },
  });

  const pyrex500 = await prisma.product.create({
    data: {
      name: 'Pyrex 500mg Tablet',
      slug: 'pyrex-500mg-tablet-skf',
      genericId: genericParacetamol.id,
      genericName: 'Paracetamol',
      companyId: skf.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 11.0,
      unit: 'Strip (10 tabs)',
      packSize: '50 x 10\'s',
      category: 'Allopathic',
    },
  });

  // --- PARACETAMOL + CAFFEINE (ENHANCED PAIN RELIEF) ---
  const napaExtra = await prisma.product.create({
    data: {
      name: 'Napa Extra',
      slug: 'napa-extra-square',
      genericId: genericParacetamolCaffeine.id,
      genericName: 'Paracetamol + Caffeine',
      companyId: square.id,
      dosageForm: 'Tablet',
      strength: '500 mg + 65 mg',
      mrp: 35.0,
      unit: 'Strip (10 tabs)',
      packSize: '20 x 10\'s',
      category: 'Allopathic',
    },
  });

  const acePlus = await prisma.product.create({
    data: {
      name: 'Ace Plus Tablet',
      slug: 'ace-plus-square',
      genericId: genericParacetamolCaffeine.id,
      genericName: 'Paracetamol + Caffeine',
      companyId: square.id,
      dosageForm: 'Tablet',
      strength: '500 mg + 65 mg',
      mrp: 40.0,
      unit: 'Strip (10 tabs)',
      packSize: '20 x 10\'s',
      category: 'Allopathic',
    },
  });

  const fastPlus = await prisma.product.create({
    data: {
      name: 'Fast Plus Tablet',
      slug: 'fast-plus-beximco',
      genericId: genericParacetamolCaffeine.id,
      genericName: 'Paracetamol + Caffeine',
      companyId: beximco.id,
      dosageForm: 'Tablet',
      strength: '500 mg + 65 mg',
      mrp: 30.0, // Cheaper alternative! (৳30 vs ৳35/40)
      unit: 'Strip (10 tabs)',
      packSize: '20 x 10\'s',
      category: 'Allopathic',
    },
  });

  // --- ESOMEPRAZOLE 20mg CAPSULES/TABLETS (PPIs) ---
  const maxpro20 = await prisma.product.create({
    data: {
      name: 'Maxpro 20mg Capsule',
      slug: 'maxpro-20mg-square',
      genericId: genericEsomeprazole.id,
      genericName: 'Esomeprazole',
      companyId: square.id,
      dosageForm: 'Capsule',
      strength: '20 mg',
      mrp: 80.0,
      unit: 'Strip (14 caps)',
      packSize: '10 x 14\'s',
      category: 'Allopathic',
      description: 'Bangladesh\'s highest selling PPI for acidity & gastric relief.',
    },
  });

  const nexum20 = await prisma.product.create({
    data: {
      name: 'Nexum 20mg Tablet',
      slug: 'nexum-20mg-beximco',
      genericId: genericEsomeprazole.id,
      genericName: 'Esomeprazole',
      companyId: beximco.id,
      dosageForm: 'Capsule',
      strength: '20 mg',
      mrp: 84.0,
      unit: 'Strip (14 caps)',
      packSize: '10 x 14\'s',
      category: 'Allopathic',
    },
  });

  const sergel20 = await prisma.product.create({
    data: {
      name: 'Sergel 20mg Capsule',
      slug: 'sergel-20mg-healthcare',
      genericId: genericEsomeprazole.id,
      genericName: 'Esomeprazole',
      companyId: healthcare.id,
      dosageForm: 'Capsule',
      strength: '20 mg',
      mrp: 75.0, // Cheaper alternative! (৳75 vs ৳80)
      unit: 'Strip (14 caps)',
      packSize: '10 x 14\'s',
      category: 'Allopathic',
    },
  });

  const esonix20 = await prisma.product.create({
    data: {
      name: 'Esonix 20mg Tablet',
      slug: 'esonix-20mg-incepta',
      genericId: genericEsomeprazole.id,
      genericName: 'Esomeprazole',
      companyId: incepta.id,
      dosageForm: 'Capsule',
      strength: '20 mg',
      mrp: 70.0, // Best price alternative! (৳70)
      unit: 'Strip (14 caps)',
      packSize: '10 x 14\'s',
      category: 'Allopathic',
    },
  });

  // --- AZITHROMYCIN 500mg TABLETS ---
  const zimax500 = await prisma.product.create({
    data: {
      name: 'Zimax 500mg Tablet',
      slug: 'zimax-500mg-square',
      genericId: genericAzithromycin.id,
      genericName: 'Azithromycin',
      companyId: square.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 175.0,
      unit: 'Box (5 tabs)',
      packSize: '3 x 5\'s',
      category: 'Allopathic',
    },
  });

  const tridosil500 = await prisma.product.create({
    data: {
      name: 'Tridosil 500mg Tablet',
      slug: 'tridosil-500mg-beximco',
      genericId: genericAzithromycin.id,
      genericName: 'Azithromycin',
      companyId: beximco.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 170.0,
      unit: 'Box (5 tabs)',
      packSize: '3 x 5\'s',
      category: 'Allopathic',
    },
  });

  const azithral500 = await prisma.product.create({
    data: {
      name: 'Azithral 500mg Tablet',
      slug: 'azithral-500mg-renata',
      genericId: genericAzithromycin.id,
      genericName: 'Azithromycin',
      companyId: renata.id,
      dosageForm: 'Tablet',
      strength: '500 mg',
      mrp: 155.0, // Cheaper alternative! (৳155 vs ৳175)
      unit: 'Box (5 tabs)',
      packSize: '3 x 5\'s',
      category: 'Allopathic',
    },
  });

  // --- MONTELUKAST 10mg TABLETS ---
  const monas10 = await prisma.product.create({
    data: {
      name: 'Monas 10mg Tablet',
      slug: 'monas-10mg-acme',
      genericId: genericMontelukast.id,
      genericName: 'Montelukast Sodium',
      companyId: square.id,
      dosageForm: 'Tablet',
      strength: '10 mg',
      mrp: 160.0,
      unit: 'Strip (10 tabs)',
      category: 'Allopathic',
    },
  });

  const provair10 = await prisma.product.create({
    data: {
      name: 'Provair 10mg Tablet',
      slug: 'provair-10mg-unimed',
      genericId: genericMontelukast.id,
      genericName: 'Montelukast Sodium',
      companyId: incepta.id,
      dosageForm: 'Tablet',
      strength: '10 mg',
      mrp: 145.0, // Cheaper alternative! (৳145 vs ৳160)
      unit: 'Strip (10 tabs)',
      category: 'Allopathic',
    },
  });

  // --- OFFER PARA LIVE STOCK PRODUCT ---
  const offerParaVitC = await prisma.product.create({
    data: {
      name: 'Offer Para Vitamin C 500mg Chewable',
      slug: 'offer-para-vit-c-square',
      genericId: genericParacetamol.id, // linked to generic
      genericName: 'Ascorbic Acid',
      companyId: square.id,
      dosageForm: 'Chewable Tablet',
      strength: '500 mg',
      mrp: 150.0,
      unit: 'Bottle (30 tabs)',
      category: 'Offer Para Flash Deals',
      isOfferParaLiveStock: true,
      offerParaStockQty: 240,
      isPharmaTrackOpaque: false,
    },
  });

  // 8. 4-Layer Pricing Rules Configuration
  // Layer 3: Company Rates (e.g. Square offers 16% on Tier A, 10% on Tier B)
  await prisma.companyRate.create({
    data: { companyId: square.id, tierId: tierA.id, rateType: 'PERCENTAGE', value: 16.0 },
  });
  await prisma.companyRate.create({
    data: { companyId: square.id, tierId: tierB.id, rateType: 'PERCENTAGE', value: 10.0 },
  });
  await prisma.companyRate.create({
    data: { companyId: beximco.id, tierId: tierA.id, rateType: 'PERCENTAGE', value: 14.0 },
  });

  // Layer 2: Product Override (Napa Extra has 18% override on Tier A)
  await prisma.productOverrideRate.create({
    data: { productId: napaExtra.id, tierId: tierA.id, rateType: 'PERCENTAGE', value: 18.0 },
  });

  // 9. Seed User Accounts for all 7 Account Types
  const admin = await prisma.user.create({
    data: {
      name: 'Siam (Super Admin)',
      email: 'admin@siamaqua.com',
      phone: '+8801700000001',
      passwordHash: defaultPasswordHash,
      accountType: 'SUPER_ADMIN',
    },
  });

  const orderStaff = await prisma.user.create({
    data: {
      name: 'Rafiq Islam (Order Manager)',
      email: 'orderstaff@siamaqua.com',
      phone: '+8801700000002',
      passwordHash: defaultPasswordHash,
      accountType: 'STAFF',
      staffProfile: { create: { department: 'Fulfillment & Logistics' } },
      userRoles: { create: [{ roleId: orderManagerRole.id }] },
    },
  });

  const wholesaleStaff = await prisma.user.create({
    data: {
      name: 'Farhana Akter (Wholesale Manager)',
      email: 'wholesalestaff@siamaqua.com',
      phone: '+8801700000003',
      passwordHash: defaultPasswordHash,
      accountType: 'STAFF',
      staffProfile: { create: { department: 'Wholesale Accounts' } },
      userRoles: { create: [{ roleId: wholesaleManagerRole.id }] },
    },
  });

  const paikariUser = await prisma.user.create({
    data: {
      name: 'Al-Amin Shop Owner',
      email: 'paikari@alaminpharma.com',
      phone: '+8801700000004',
      passwordHash: defaultPasswordHash,
      accountType: 'PAIKARI_SELLER',
      customerProfile: {
        create: {
          shopName: 'Al-Amin Pharmacy & General Store',
          ownerName: 'Md. Al-Amin',
          address: 'Mirpur-10, Dhaka-1216',
          tradeLicenseNo: 'TRAD/DNCC/098765/2024',
          drugLicenseNo: 'DL-DH-98765',
          tierId: tierB.id,
          creditLimit: 25000,
          codLimit: 75000,
          deliveryFeeThreshold: 1500,
        },
      },
    },
  });

  // Layer 1 Manual Override for Paikari User
  await prisma.customerManualOverrideRate.create({
    data: {
      userId: paikariUser.id,
      productId: napa500.id,
      rateType: 'FLAT_RATE',
      value: 10.5, // Agreed custom shop rate of ৳10.50
    },
  });

  const wholesalerUser = await prisma.user.create({
    data: {
      name: 'Kamal Distributor',
      email: 'wholesale@medidistributors.com',
      phone: '+8801700000005',
      passwordHash: defaultPasswordHash,
      accountType: 'WHOLESALER_SELLER',
      customerProfile: {
        create: {
          shopName: 'MediDistributors Wholesale Corp',
          ownerName: 'Kamal Hossain',
          address: 'Mitford Road, Old Dhaka',
          tradeLicenseNo: 'TRAD/DSCC/112233/2023',
          drugLicenseNo: 'DL-DH-112233',
          tierId: tierA.id,
          creditLimit: 500000,
          codLimit: 200000,
          deliveryFeeThreshold: 5000,
        },
      },
    },
  });

  const mpoUser = await prisma.user.create({
    data: {
      name: 'Tanvir Ahmed (Dhaka North MPO)',
      email: 'mpo.sakib@siamaqua.com',
      phone: '+8801700000006',
      passwordHash: defaultPasswordHash,
      accountType: 'MPO',
    },
  });

  const foodVendorUser = await prisma.user.create({
    data: {
      name: 'Sultan Chef',
      email: 'vendor@dhakabiryani.com',
      phone: '+8801700000007',
      passwordHash: defaultPasswordHash,
      accountType: 'FOOD_VENDOR',
      customerProfile: {
        create: {
          shopName: 'Dhaka Biryani & Kacchi Express',
          ownerName: 'Sultan Ahmed',
          address: 'Dhanmondi 27, Dhaka',
          tierId: tierC.id,
          creditLimit: 0,
          codLimit: 10000,
          deliveryFeeThreshold: 500,
        },
      },
    },
  });

  const publicUser = await prisma.user.create({
    data: {
      name: 'Tariq Rahman',
      email: 'customer@gmail.com',
      phone: '+8801700000008',
      passwordHash: defaultPasswordHash,
      accountType: 'PUBLIC_USER',
    },
  });

  // Sample Pending Application Queue
  await prisma.applicationQueue.create({
    data: {
      businessName: 'Green Life Model Pharmacy',
      ownerName: 'Dr. Mahmudur Rahman',
      phone: '+8801711223344',
      email: 'dr.mahmud@greenlifepharma.bd',
      address: 'Uttara Sector 7, Dhaka',
      accountType: 'PAIKARI_SELLER',
      categoryInterest: 'Allopathic Medicine & Surgical Supplies',
      tradeLicenseNo: 'TRAD/DNCC/778899/2024',
      drugLicenseNo: 'DL-DH-778899',
      status: 'PENDING_REVIEW',
    },
  });

  // Sample Order in Draft Sale status
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-0001',
      userId: paikariUser.id,
      sectorType: 'PHARMACY',
      platformStatus: 'DRAFT_SALE',
      subtotal: 1050.0,
      discountAmount: 105.0,
      deliveryFee: 50.0,
      totalAmount: 995.0,
      isCod: true,
      deliveryAddress: 'Mirpur-10, Dhaka-1216',
      items: {
        create: [
          {
            productId: napaExtra.id,
            unitType: 'STRIP',
            requestedQuantity: 20,
            confirmedQuantity: 20,
            unitMrp: 35.0,
            tieredUnitPrice: 28.7,
            finalUnitPrice: 28.7,
            appliedUnitPrice: 28.7,
            appliedLayer: 'PRODUCT_OVERRIDE',
            rateType: 'PERCENTAGE',
            rateValue: 18.0,
            totalPrice: 574.0,
            verificationStatus: 'FULL_STOCK',
          },
          {
            productId: napa500.id,
            unitType: 'STRIP',
            requestedQuantity: 40,
            confirmedQuantity: 40,
            unitMrp: 12.0,
            tieredUnitPrice: 10.5,
            finalUnitPrice: 10.5,
            appliedUnitPrice: 10.5,
            appliedLayer: 'CUSTOMER_MANUAL_OVERRIDE',
            rateType: 'FLAT_RATE',
            rateValue: 10.5,
            totalPrice: 420.0,
            verificationStatus: 'FULL_STOCK',
          },
        ],
      },
    },
  });

  // Seed Initial Platform Settings
  await prisma.platformSetting.createMany({
    data: [
      {
        key: 'problem_customer_threshold',
        value: '3',
        description: 'Number of cancellations/refused deliveries before customer is auto-flagged for review',
      },
      {
        key: 'default_delivery_fee',
        value: '60',
        description: 'Standard delivery fee in BDT for pharmacy orders',
      },
      {
        key: 'default_free_delivery_threshold',
        value: '3000',
        description: 'Default order total in BDT to qualify for free delivery',
      },
      {
        key: 'bank_account_info',
        value: JSON.stringify({
          bankName: 'Islami Bank Bangladesh Ltd.',
          accountName: "Siam's Aqua Pharmaceutical Distribution",
          accountNumber: '20501234567890',
          branchName: 'Mirpur Branch, Dhaka',
          routingNumber: '125263748',
        }),
        description: 'Company bank account details displayed for B2B bank transfers',
      },
      {
        key: 'bkash_merchant_number',
        value: '01700000001',
        description: 'bKash merchant wallet for Paikari payments',
      },
    ],
  });

  // Sample Staged Medicine Import Batch for Demonstration
  const stagingBatch = await prisma.medicineStagingBatch.create({
    data: {
      batchNumber: 'MBATCH-2026-001',
      fileName: 'incepta_catalog_sample.csv',
      totalRows: 4,
      validRows: 3,
      duplicateRows: 1,
      errorRows: 0,
      status: 'STAGED',
      importedBy: 'admin@siamaqua.com',
      items: {
        create: [
          {
            brandName: 'Pantonic 20mg Capsule',
            genericName: 'Pantoprazole Sodium',
            companyName: 'Incepta Pharmaceuticals Ltd.',
            dosageForm: 'Capsule',
            strength: '20 mg',
            mrp: 80.0,
            unit: 'Strip (14 caps)',
            therapeuticClass: 'Proton Pump Inhibitors',
            isDuplicate: false,
            status: 'APPROVED',
          },
          {
            brandName: 'Osartil 50mg Tablet',
            genericName: 'Losartan Potassium',
            companyName: 'Incepta Pharmaceuticals Ltd.',
            dosageForm: 'Tablet',
            strength: '50 mg',
            mrp: 110.0,
            unit: 'Strip (10 tabs)',
            therapeuticClass: 'Angiotensin Receptor Blocker (Anti-Hypertensive)',
            isDuplicate: false,
            status: 'APPROVED',
          },
          {
            brandName: 'Napa 500mg Tablet',
            genericName: 'Paracetamol',
            companyName: 'Square Pharmaceuticals Ltd.',
            dosageForm: 'Tablet',
            strength: '500 mg',
            mrp: 12.0,
            unit: 'Strip (10 tabs)',
            isDuplicate: true,
            existingProductId: napa500.id,
            status: 'REJECTED',
          },
        ],
      },
    },
  });

  console.log('MedEx Pharmaceutical database seeding complete!');
  console.log(`- Created ${await prisma.generic.count()} Generics`);
  console.log(`- Created ${await prisma.product.count()} Brand Formulations across ${await prisma.company.count()} Manufacturers`);
  console.log(`- Created Staging Batch with ${await prisma.medicineStagingItem.count()} staged review items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
