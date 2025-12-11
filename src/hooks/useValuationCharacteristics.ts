import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValuationCharacteristic {
  id: string;
  category: string;
  category_name: string;
  char_code: string;
  char_name: string;
  char_description: string | null;
  char_type: string;
  weight_value: number;
  category_cap_max: number;
  category_cap_min: number;
  display_order: number;
  is_active: boolean | null;
  applies_to: "casa" | "apartamento" | "ambos";
}

export interface DocumentationFactor {
  id: string;
  status_code: string;
  status_name: string;
  factor: number | null;
  adjustment: number | null;
  severity: string;
  action_required: string;
  description: string | null;
  display_order: number;
}

// Determina se o tipo de imóvel é casa
export const isCasaType = (tipoImovel: string): boolean => {
  const tipoLower = tipoImovel.toLowerCase();
  return tipoLower.includes('casa') || tipoLower.includes('cobertura');
};

// Calcula bônus/penalidade por proporção terreno/construção
export const calculateTerrainBonus = (areaConstruida: number, areaTerreno: number): { proporcao: number; bonus: number; label: string } => {
  if (!areaTerreno || areaTerreno <= 0 || !areaConstruida || areaConstruida <= 0) {
    return { proporcao: 0, bonus: 0, label: "Não informado" };
  }
  
  const proporcao = areaTerreno / areaConstruida;
  
  let bonus = 0;
  let label = "";
  
  if (proporcao >= 3.0) {
    bonus = 0.06;
    label = "Terreno Excepcional";
  } else if (proporcao >= 2.5) {
    bonus = 0.04;
    label = "Terreno Amplo";
  } else if (proporcao >= 2.0) {
    bonus = 0.02;
    label = "Terreno Bom";
  } else if (proporcao >= 1.5) {
    bonus = 0;
    label = "Terreno Padrão";
  } else if (proporcao >= 1.2) {
    bonus = -0.02;
    label = "Terreno Apertado";
  } else {
    bonus = -0.04;
    label = "Terreno Muito Apertado";
  }
  
  return { proporcao: Math.round(proporcao * 100) / 100, bonus, label };
};

export const useValuationCharacteristics = (tipoImovel?: string) => {
  const appliesTo = tipoImovel ? (isCasaType(tipoImovel) ? 'casa' : 'apartamento') : null;
  
  return useQuery({
    queryKey: ["valuation-characteristics", appliesTo],
    queryFn: async () => {
      let query = supabase
        .from("valuation_characteristics")
        .select("*")
        .eq("is_active", true);
      
      // Filtrar por tipo de imóvel se especificado
      if (appliesTo) {
        query = query.or(`applies_to.eq.ambos,applies_to.eq.${appliesTo}`);
      }
      
      const { data, error } = await query.order("display_order");

      if (error) throw error;
      return data as ValuationCharacteristic[];
    },
  });
};

export const useDocumentationFactors = () => {
  return useQuery({
    queryKey: ["documentation-factors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valuation_documentation_factors")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as DocumentationFactor[];
    },
  });
};

// Group characteristics by category
export const groupCharacteristicsByCategory = (characteristics: ValuationCharacteristic[]) => {
  return characteristics.reduce((acc, char) => {
    if (!acc[char.category]) {
      acc[char.category] = {
        name: char.category_name,
        cap_max: char.category_cap_max,
        cap_min: char.category_cap_min,
        items: [],
      };
    }
    acc[char.category].items.push(char);
    return acc;
  }, {} as Record<string, { name: string; cap_max: number; cap_min: number; items: ValuationCharacteristic[] }>);
};
