import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../src/common/services/prisma.service';
import { CatalogService } from '../src/modules/catalog/catalog.service';
import { DatabaseSearchProvider } from '../src/modules/catalog/search/database-search.provider';
import { ImportService } from '../src/modules/import/import.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('Phase 0-A: MedEx Medicine + Generic Database Suite', () => {
  let prisma: PrismaService;
  let searchProvider: DatabaseSearchProvider;
  let catalogService: CatalogService;
  let importService: ImportService;
  let auditService: AuditService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    searchProvider = new DatabaseSearchProvider(prisma);
    catalogService = new CatalogService(prisma, searchProvider);
    auditService = new AuditService(prisma);
    importService = new ImportService(prisma, auditService);
  });

  beforeEach(async () => {
    // Clean up temporary test products created during publish tests
    await prisma.product.deleteMany({
      where: { name: 'Ciprocin 500mg Tablet' },
    });
    await prisma.medicineStagingBatch.deleteMany({
      where: { fileName: 'test_batch.csv' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. MedEx Schema & Generic Relational Linking
  it('Requirement 1: Schema supports brand name, generic tag, dosage form, strength, and MedEx info', async () => {
    const napa = await prisma.product.findFirst({
      where: { name: { contains: 'Napa 500mg' } },
      include: { generic: true, company: true },
    });

    expect(napa).toBeDefined();
    expect(napa?.dosageForm).toBe('Tablet');
    expect(napa?.strength).toBe('500 mg');
    expect(napa?.genericName).toBe('Paracetamol');
    expect(napa?.generic?.therapeuticClass).toBe('Analgesics & Antipyretics');
    expect(napa?.generic?.indications).toContain('Fever');
    expect(napa?.company.name).toBe('Square Pharmaceuticals Ltd.');
  });

  // 2. Fast Fuzzy Multi-Field Search
  it('Requirement 2: Search returns fast fuzzy matches on brand name, generic tag, and company', async () => {
    // A. Brand Search for "Napa"
    const brandResults = await catalogService.search({ query: 'Napa' });
    expect(brandResults.total).toBeGreaterThanOrEqual(2);
    expect(brandResults.products.some((p) => p.name.includes('Napa'))).toBe(true);

    // B. Generic Tag Search for "Esomeprazole"
    const genericResults = await catalogService.search({ generic: 'Esomeprazole' });
    expect(genericResults.total).toBeGreaterThanOrEqual(4); // Maxpro, Nexum, Sergel, Esonix
    expect(genericResults.products.some((p) => p.name === 'Maxpro 20mg Capsule')).toBe(true);
    expect(genericResults.products.some((p) => p.name === 'Sergel 20mg Capsule')).toBe(true);

    // C. Dosage Form Filter: 'Capsule'
    const capsuleResults = await catalogService.search({ dosageForm: 'Capsule' });
    expect(capsuleResults.products.every((p) => p.dosageForm === 'Capsule')).toBe(true);
  });

  // 3. Generic Alternative Suggestions (MedEx Alternative Brand Engine)
  it('Requirement 4: Surfaces same-generic alternative brands with price differences and cheaper options', async () => {
    const napa500 = await prisma.product.findFirst({
      where: { name: 'Napa 500mg Tablet' },
    });
    expect(napa500).toBeDefined();

    const result = await catalogService.getGenericAlternatives(napa500!.id);

    expect(result.currentProduct.name).toBe('Napa 500mg Tablet');
    expect(result.currentProduct.mrp).toBe(12.0);
    expect(result.genericInfo?.name).toBe('Paracetamol');
    expect(result.alternatives.length).toBeGreaterThanOrEqual(3);

    // Verify lower-priced alternative calculations
    const renova = result.alternatives.find((a) => a.brandName.includes('Renova'));
    expect(renova).toBeDefined();
    expect(renova?.mrp).toBe(9.5);
    expect(renova?.isLowerPriced).toBe(true);
    expect(renova?.priceDifference).toBe(2.5); // 12.0 - 9.5 = 2.50 BDT savings
    expect(renova?.priceDifferencePercent).toBe(20.83); // 20.83% savings!

    const fast = result.alternatives.find((a) => a.brandName.includes('Fast'));
    expect(fast?.mrp).toBe(10.0);
    expect(fast?.priceDifference).toBe(2.0);
    expect(fast?.isLowerPriced).toBe(true);
  });

  // 4. Staging Import Pipeline with De-duplication & Publish Step
  it('Requirement 3: Staging import pipeline detects duplicates and safely publishes approved batches to catalog', async () => {
    // Sample CSV with 1 new medicine and 1 existing duplicate medicine
    const stagingCsv = `brandName,genericName,companyName,dosageForm,strength,mrp,category,indications
Ciprocin 500mg Tablet,Ciprofloxacin,Square Pharmaceuticals Ltd.,Tablet,500 mg,150.0,Allopathic,Bacterial infections
Napa 500mg Tablet,Paracetamol,Square Pharmaceuticals Ltd.,Tablet,500 mg,12.0,Allopathic,Fever`;

    const stageRes = await importService.stageMedicineCsv(stagingCsv, 'test_batch.csv', {
      id: 'admin-id',
      email: 'admin@siamaqua.com',
    });

    expect(stageRes.batch.totalRows).toBe(2);
    expect(stageRes.batch.validRows).toBe(1); // Ciprocin
    expect(stageRes.batch.duplicateRows).toBe(1); // Napa duplicate detected!
    expect(stageRes.batch.status).toBe('STAGED');

    // Publish the staged batch
    const publishRes = await importService.publishBatch(stageRes.batch.id, {
      id: 'admin-id',
      email: 'admin@siamaqua.com',
    });

    expect(publishRes.publishedCount).toBe(1);

    // Verify new product Ciprocin is now live in production catalog and linked to Generic
    const ciprocin = await prisma.product.findFirst({
      where: { name: 'Ciprocin 500mg Tablet' },
      include: { generic: true },
    });
    expect(ciprocin).toBeDefined();
    expect(ciprocin?.genericName).toBe('Ciprofloxacin');
    expect(ciprocin?.generic?.name).toBe('Ciprofloxacin');
  });
});
