import {
  MedicineSearchParams,
  MedicineProductSummary,
  GenericAlternativeResult,
  GenericInfo,
} from '@siam-aqua/shared-types';

export const MEDICINE_SEARCH_PROVIDER = 'MEDICINE_SEARCH_PROVIDER';

export interface MedicineSearchProvider {
  /**
   * Fast fuzzy brand name and generic name search with filtering and pagination.
   */
  search(params: MedicineSearchParams): Promise<{
    products: MedicineProductSummary[];
    total: number;
    matchedGenerics: { name: string; count: number }[];
    matchedCompanies: { name: string; count: number }[];
  }>;

  /**
   * Surfaces all alternative brands sharing the exact same generic name and dosage form,
   * sorted by price difference (lower priced & active offer deals surfaced first).
   */
  findGenericAlternatives(
    productId: string,
    options?: { limit?: number },
  ): Promise<GenericAlternativeResult>;

  /**
   * Fetches full MedEx-style generic monograph and all associated brand products in Bangladesh.
   */
  getGenericDetails(
    slugOrId: string,
  ): Promise<{ generic: GenericInfo; products: MedicineProductSummary[] } | null>;
}
