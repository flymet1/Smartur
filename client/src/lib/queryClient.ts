import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // If 401 Unauthorized, redirect to login page
    if (res.status === 401) {
      // Don't redirect if already on login page or public pages
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && !currentPath.startsWith("/takip/") && !currentPath.startsWith("/subscription")) {
        window.location.href = "/login";
      }
      throw new Error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    }
    
    const text = (await res.text()) || res.statusText;
    // Try to parse JSON error response and extract just the error message
    try {
      const json = JSON.parse(text);
      if (json.error) {
        throw new Error(json.error);
      }
      // If JSON but no error field, show generic message
      throw new Error("Bir hata oluştu");
    } catch (e) {
      // If it's already an Error we created, rethrow it
      if (e instanceof Error) {
        throw e;
      }
      // If JSON parse failed, show generic message (not raw text)
      throw new Error("Bir hata oluştu");
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
