import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MenuSettings {
  units: string[];
  requestors: string[];
  productsFor: string[];
}

const DEFAULT_SETTINGS: MenuSettings = {
  units: ["pc", "sack", "pack", "kilo", "case"],
  requestors: ["Aira", "Francia", "Airene", "Dianne"],
  productsFor: ["J1"],
};

export function useMenuSettings() {
  const [settings, setSettings] = useState<MenuSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("units, requestors, productsFor")
        .limit(1)
        .single();

      if (!error && data) {
        setSettings(data as MenuSettings);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}
