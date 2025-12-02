import { useMemo } from 'react';

export interface Property {
  id: number;
  condominio: string;
  type: string;
  price: string;
  priceValue: number;
  size: string;
  sizeValue: number;
  status: 'active' | 'sold' | 'pending';
}

// Mock data - Replace with real Supabase query when properties table is created
const mockProperties: Property[] = [
  {
    id: 1,
    condominio: "Península",
    type: "Apartamento",
    price: "R$ 3.200.000",
    priceValue: 3200000,
    size: "180m²",
    sizeValue: 180,
    status: "active",
  },
  {
    id: 2,
    condominio: "Riserva Golf",
    type: "Cobertura",
    price: "R$ 5.800.000",
    priceValue: 5800000,
    size: "320m²",
    sizeValue: 320,
    status: "sold",
  },
  {
    id: 3,
    condominio: "Majestic",
    type: "Apartamento",
    price: "R$ 2.900.000",
    priceValue: 2900000,
    size: "150m²",
    sizeValue: 150,
    status: "active",
  },
  {
    id: 4,
    condominio: "Le Parc",
    type: "Apartamento",
    price: "R$ 4.100.000",
    priceValue: 4100000,
    size: "220m²",
    sizeValue: 220,
    status: "pending",
  },
  {
    id: 5,
    condominio: "Ilha Pura",
    type: "Apartamento",
    price: "R$ 2.500.000",
    priceValue: 2500000,
    size: "130m²",
    sizeValue: 130,
    status: "active",
  },
  {
    id: 6,
    condominio: "Península",
    type: "Cobertura",
    price: "R$ 6.200.000",
    priceValue: 6200000,
    size: "380m²",
    sizeValue: 380,
    status: "active",
  },
  {
    id: 7,
    condominio: "Riserva Golf",
    type: "Apartamento",
    price: "R$ 3.800.000",
    priceValue: 3800000,
    size: "200m²",
    sizeValue: 200,
    status: "active",
  },
  {
    id: 8,
    condominio: "Majestic",
    type: "Casa",
    price: "R$ 4.500.000",
    priceValue: 4500000,
    size: "280m²",
    sizeValue: 280,
    status: "pending",
  },
];

export interface PropertyFilters {
  priceMin?: number;
  priceMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  type?: string;
  condominio?: string;
  status?: string;
}

export function useProperties(filters?: PropertyFilters) {
  return useMemo(() => {
    let filtered = [...mockProperties];

    if (filters?.priceMin) {
      filtered = filtered.filter(p => p.priceValue >= filters.priceMin!);
    }
    if (filters?.priceMax) {
      filtered = filtered.filter(p => p.priceValue <= filters.priceMax!);
    }
    if (filters?.sizeMin) {
      filtered = filtered.filter(p => p.sizeValue >= filters.sizeMin!);
    }
    if (filters?.sizeMax) {
      filtered = filtered.filter(p => p.sizeValue <= filters.sizeMax!);
    }
    if (filters?.type) {
      filtered = filtered.filter(p => p.type.toLowerCase() === filters.type!.toLowerCase());
    }
    if (filters?.condominio) {
      filtered = filtered.filter(p => p.condominio.toLowerCase() === filters.condominio!.toLowerCase());
    }
    if (filters?.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    return filtered;
  }, [filters]);
}
