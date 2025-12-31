import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertCapacity } from "@shared/schema";

export function useCapacity(filters?: { date?: string; activityId?: string }) {
  return useQuery({
    queryKey: [api.capacity.list.path, filters],
    queryFn: async () => {
      const url = new URL(window.location.origin + api.capacity.list.path);
      if (filters?.date) url.searchParams.append("date", filters.date);
      if (filters?.activityId) url.searchParams.append("activityId", filters.activityId);
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Kapasite bilgisi alınamadı");
      return api.capacity.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCapacity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCapacity) => {
      const res = await fetch(api.capacity.create.path, {
        method: api.capacity.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Kapasite eklenemedi");
      return api.capacity.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.capacity.list.path] }),
  });
}
