import { useMemo } from 'react';
import { useProperties } from './useProperties';

export function useKPIStats() {
  const properties = useProperties();

  return useMemo(() => {
    const totalProperties = properties.length;
    const activeListings = properties.filter(p => p.status === 'active').length;
    const soldProperties = properties.filter(p => p.status === 'sold').length;
    
    const averagePrice = properties.length > 0
      ? properties.reduce((sum, p) => sum + p.priceValue, 0) / properties.length
      : 0;

    const closingRate = totalProperties > 0
      ? Math.round((soldProperties / totalProperties) * 100)
      : 0;

    return {
      totalProperties,
      averagePrice: `R$ ${(averagePrice / 1000000).toFixed(1)}M`,
      activeListings,
      closingRate: `${closingRate}%`,
    };
  }, [properties]);
}
