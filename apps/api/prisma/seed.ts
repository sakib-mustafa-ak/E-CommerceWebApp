import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Siam\'s Aqua E-Commerce database...');

  // 1. Clear previous data
  await prisma.auditLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customerManualOverrideRate.deleteMany({});
  await prisma.productOverrideRate.deleteMany({});
  await prisma.companyRate.deleteMany({});
  await prisma.product.deleteMany({});
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
    { slug: 'catalog.manage_products', name: 'Create & Edit Products', category: 'catalog' },
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
        ],
      },
    },
  });

  const catalogManagerRole = await prisma.role.create({
    data: {
      name: 'Catalog & Stock Specialist',
      slug: 'catalog_specialist',
      description: 'Manages products and inventory exports',
      rolePermissions: {
        create: [
          { permissionId: permMap.get('catalog.view_products')! },
          { permissionId: permMap.get('catalog.manage_products')! },
          { permissionId: permMap.get('catalog.export')! },
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
      defaultValue: 15.0, // 15% default discount
    },
  });

  const tierB = await prisma.pricingTier.create({
    data: {
      code: 'TIER_B',
      name: 'Tier B (Standard Paikari Retailer)',
      description: 'Standard discount tier for regular pharmacy shops',
      defaultRateType: 'PERCENTAGE',
      defaultValue: 10.0, // 10% default discount
    },
  });

  const tierC = await prisma.pricingTier.create({
    data: {
      code: 'TIER_C',
      name: 'Tier C (Entry Retail / New Shop)',
      description: 'Introductory tier for small village pharmacies',
      defaultRateType: 'PERCENTAGE',
      defaultValue: 5.0, // 5% default discount
    },
  });

  // 5. Companies & Products
  const square = await prisma.company.create({
    data: { name: 'Square Pharmaceuticals Ltd.', code: 'SQUARE' },
  });

  const beximco = await prisma.company.create({
    data: { name: 'Beximco Pharmaceuticals Ltd.', code: 'BEXIMCO' },
  });

  const incepta = await prisma.company.create({
    data: { name: 'Incepta Pharmaceuticals Ltd.', code: 'INCEPTA' },
  });

  // Products
  const napaExtra = await prisma.product.create({
    data: {
      name: 'Napa Extra 500mg+65mg',
      genericName: 'Paracetamol + Caffeine',
      mrp: 35.0,
      companyId: square.id,
      category: 'Analgesic',
      unit: 'Strip (10 tabs)',
      isPharmaTrackOpaque: true,
    },
  });

  const acePlus = await prisma.product.create({
    data: {
      name: 'Ace Plus Tablet',
      genericName: 'Paracetamol + Caffeine',
      mrp: 40.0,
      companyId: square.id,
      category: 'Analgesic',
      unit: 'Strip (10 tabs)',
      isPharmaTrackOpaque: true,
    },
  });

  const napaSyrup = await prisma.product.create({
    data: {
      name: 'Napa Syrup 60ml',
      genericName: 'Paracetamol 120mg/5ml',
      mrp: 55.5,
      companyId: square.id,
      category: 'Syrup',
      unit: 'Bottle',
      isPharmaTrackOpaque: true,
    },
  });

  const bexiCold = await prisma.product.create({
    data: {
      name: 'BexiCold Tablet',
      genericName: 'Pseudoephedrine + Paracetamol',
      mrp: 120.0,
      companyId: beximco.id,
      category: 'Cold & Cough',
      unit: 'Box (50 tabs)',
      isPharmaTrackOpaque: true,
    },
  });

  const pantonic = await prisma.product.create({
    data: {
      name: 'Pantonic 20mg Capsule',
      genericName: 'Pantoprazole Sodium',
      mrp: 80.0,
      companyId: incepta.id,
      category: 'Gastric & PPI',
      unit: 'Strip (14 caps)',
      isPharmaTrackOpaque: true,
    },
  });

  // Offer Para Live Stock Products (Rule 4: Separate live inventory)
  const offerParaVitC = await prisma.product.create({
    data: {
      name: 'Offer Para Vitamin C 500mg Chewable',
      genericName: 'Ascorbic Acid',
      mrp: 150.0,
      companyId: square.id,
      category: 'Offer Para Flash Deals',
      unit: 'Bottle (30 tabs)',
      isOfferParaLiveStock: true,
      offerParaStockQty: 240,
      isPharmaTrackOpaque: false,
    },
  });

  // Layer 3: Company Rates (e.g. Square offers 16% on Tier A)
  await prisma.companyRate.create({
    data: {
      companyId: square.id,
      tierId: tierA.id,
      rateType: 'PERCENTAGE',
      value: 16.0,
    },
  });

  // Layer 2: Product Override (Napa Extra has 18% override on Tier A)
  await prisma.productOverrideRate.create({
    data: {
      productId: napaExtra.id,
      tierId: tierA.id,
      rateType: 'PERCENTAGE',
      value: 18.0,
    },
  });

  // 6. Seed Accounts for all 7 Account Types
  // 1. Super Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Siam (Super Admin)',
      email: 'admin@siamaqua.com',
      phone: '+8801700000001',
      passwordHash: defaultPasswordHash,
      accountType: 'SUPER_ADMIN',
    },
  });

  // 2. Staff: Order Manager
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

  // 3. Staff: Wholesale & Customer Manager
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

  // 4. Paikari Seller (Retail Pharmacy Shop)
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

  // Manual Override for Paikari User (Layer 1: Napa Syrup flat 45.00 BDT)
  await prisma.customerManualOverrideRate.create({
    data: {
      userId: paikariUser.id,
      productId: napaSyrup.id,
      rateType: 'FLAT_RATE',
      value: 45.0,
    },
  });

  // 5. Wholesaler Seller ("Hawlsel")
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

  // 6. MPO (Medical Promotion Officer - Direct Admin Only)
  const mpoUser = await prisma.user.create({
    data: {
      name: 'Tanvir Ahmed (Dhaka North MPO)',
      email: 'mpo.sakib@siamaqua.com',
      phone: '+8801700000006',
      passwordHash: defaultPasswordHash,
      accountType: 'MPO',
    },
  });

  // 7. Food Vendor (Restaurant / Grocery)
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

  // 8. Public Retail Consumer
  const publicUser = await prisma.user.create({
    data: {
      name: 'Tariq Rahman',
      email: 'customer@gmail.com',
      phone: '+8801700000008',
      passwordHash: defaultPasswordHash,
      accountType: 'PUBLIC_USER',
    },
  });

  // Sample Pending Application Queue Item
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
      tradeLicenseFileUrl: 'uploads/sample-trade-license.pdf',
      drugLicenseFileUrl: 'uploads/sample-drug-license.pdf',
      status: 'PENDING_REVIEW',
    },
  });

  // Sample Order in Draft Sale status (Rule 3)
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
            quantity: 20,
            unitMrp: 35.0,
            appliedUnitPrice: 28.7,
            appliedLayer: 'PRODUCT_OVERRIDE',
            rateType: 'PERCENTAGE',
            rateValue: 18.0,
            totalPrice: 574.0,
          },
          {
            productId: napaSyrup.id,
            quantity: 10,
            unitMrp: 55.5,
            appliedUnitPrice: 45.0,
            appliedLayer: 'CUSTOMER_MANUAL_OVERRIDE',
            rateType: 'FLAT_RATE',
            rateValue: 45.0,
            totalPrice: 450.0,
          },
        ],
      },
    },
  });

  console.log('Siam\'s Aqua E-Commerce seed complete!');
  console.log('Sample Accounts created:');
  console.log('1. Super Admin: admin@siamaqua.com / SiamAqua@2026');
  console.log('2. Order Manager: orderstaff@siamaqua.com / SiamAqua@2026');
  console.log('3. Wholesale Manager: wholesalestaff@siamaqua.com / SiamAqua@2026');
  console.log('4. Paikari Seller: paikari@alaminpharma.com / SiamAqua@2026');
  console.log('5. Wholesaler Seller: wholesale@medidistributors.com / SiamAqua@2026');
  console.log('6. MPO Field Rep: mpo.sakib@siamaqua.com / SiamAqua@2026');
  console.log('7. Food Vendor: vendor@dhakabiryani.com / SiamAqua@2026');
  console.log('8. Public Consumer: customer@gmail.com / SiamAqua@2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
