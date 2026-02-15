import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useSalesAnalytics(marketplace?: string) {
  return useQuery({
    queryKey: [api.sales.analytics.path, marketplace],
    queryFn: async () => {
      const url = new URL(api.sales.analytics.path, window.location.origin);
      if (marketplace && marketplace !== "All") {
        url.searchParams.set("marketplace", marketplace);
      }
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales analytics");
      return api.sales.analytics.responses[200].parse(await res.json());
    },
  });
}
