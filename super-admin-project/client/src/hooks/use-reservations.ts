import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertReservation } from "@shared/schema";

export function useReservations() {
  return useQuery({
    queryKey: [api.reservations.list.path],
    queryFn: async () => {
      const res = await fetch(api.reservations.list.path);
      if (!res.ok) throw new Error("Failed to fetch reservations");
      return api.reservations.list.responses[200].parse(await res.json());
    },
  });
}

export function useReservationStats() {
  return useQuery({
    queryKey: [api.reservations.stats.path],
    queryFn: async () => {
      const res = await fetch(api.reservations.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.reservations.stats.responses[200].parse(await res.json());
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertReservation) => {
      const res = await fetch(api.reservations.create.path, {
        method: api.reservations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Rezervasyon oluşturulamadı");
      return api.reservations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reservations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.reservations.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.capacity.list.path] });
    },
  });
}
