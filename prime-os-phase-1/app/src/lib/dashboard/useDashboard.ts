/**
 * src/lib/dashboard/useDashboard.ts
 * React Query hook providing Control Tower dashboard data
 */
import { useQuery } from "@tanstack/react-query";
import { generateControlTowerData } from "./seedControlTower";
import type { DashboardDTO } from "./types";

export function useDashboard() {
    return useQuery<DashboardDTO>({
        queryKey: ["control-tower-dashboard"],
        queryFn: async () => {
            // Simulate network latency
            await new Promise(resolve => setTimeout(resolve, 800));
            return generateControlTowerData();
        },
        // Keep fresh for 5 mins
        staleTime: 5 * 60 * 1000,
    });
}
