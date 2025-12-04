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

export const useValuationCharacteristics = () => {
  return useQuery({
    queryKey: ["valuation-characteristics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valuation_characteristics")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

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
