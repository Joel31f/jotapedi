import type { OrderBrand } from '@/types/database'

export interface BrandConfig {
  id: OrderBrand
  label: string
  shortName: string
  logo: string
}

export const ORDER_BRANDS: BrandConfig[] = [
  { id: 'moldplast', label: 'MoldPlast', shortName: 'MOLD PLAST', logo: '/brands/moldplast.jpeg' },
  { id: 'marcoplast', label: 'MarcoPlast', shortName: 'MARCO PLAST', logo: '/brands/marcoplast.jpeg' },
]

export const ORDER_BRAND_MAP: Record<OrderBrand, BrandConfig> = Object.fromEntries(
  ORDER_BRANDS.map((b) => [b.id, b]),
) as Record<OrderBrand, BrandConfig>
