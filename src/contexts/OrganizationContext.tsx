import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  creci: string | null;
  website: string | null;
  person_type: string | null;
  logo_url: string | null;
  plan: string;
  plan_status: string;
  trial_ends_at: string | null;
  max_users: number;
  max_valuations_month: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface OrgLimits {
  users: { allowed: boolean; current: number; max: number };
  valuations: { allowed: boolean; current: number; max: number };
}

interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  limits: OrgLimits | null;
  refetch: () => Promise<void>;
  updateOrganization: (updates: Partial<Organization>) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [limits, setLimits] = useState<OrgLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganization = async () => {
    if (!user) {
      setOrganization(null);
      setLimits(null);
      setIsLoading(false);
      return;
    }

    try {
      // Get user's org via profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      const { data: org, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      if (error) throw error;

      setOrganization(org as Organization);

      // Fetch limits
      const { data: userLimits } = await supabase.rpc("check_org_limits", {
        _org_id: profile.organization_id,
        _resource_type: "users",
      });

      const { data: valLimits } = await supabase.rpc("check_org_limits", {
        _org_id: profile.organization_id,
        _resource_type: "valuations_month",
      });

      setLimits({
        users: {
          allowed: userLimits?.[0]?.allowed ?? true,
          current: Number(userLimits?.[0]?.current_count ?? 0),
          max: userLimits?.[0]?.max_allowed ?? 999,
        },
        valuations: {
          allowed: valLimits?.[0]?.allowed ?? true,
          current: Number(valLimits?.[0]?.current_count ?? 0),
          max: valLimits?.[0]?.max_allowed ?? 999,
        },
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    if (!organization) return;

    const { error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", organization.id);

    if (error) throw error;

    setOrganization((prev) => (prev ? { ...prev, ...updates } : null));
  };

  useEffect(() => {
    fetchOrganization();
  }, [user?.id]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        isLoading,
        limits,
        refetch: fetchOrganization,
        updateOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
