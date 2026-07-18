import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface Category {
  id: number;
  slug: string;
  name_tr: string;
  sort_order: number;
}

// RLS already restricts anon reads to is_active categories
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name_tr, sort_order")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Category[];
    },
    // Categories change ~never; cache them for the session
    staleTime: Infinity,
  });
}
