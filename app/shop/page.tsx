import type { Metadata } from 'next'
import ShopClient from '@/components/shop/ShopClient'

export const metadata: Metadata = {
  title: 'Shop all kurtas and kurtis',
  description:
    'Browse every kurta and kurti from Dhaaga-E-Jashn. Filter by category, search by name and sort by price or newest arrivals.',
  alternates: { canonical: '/shop' },
}

export default function ShopPage() {
  return <ShopClient />
}
