import { useState, useEffect, useCallback } from "react";
import type { Provider, ProviderProduct, ProviderAccount } from "@/types";

export function useProviders() {
  const [data,    setData]    = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setError("Error al cargar providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export function useProvider(id: string) {
  const [data,    setData]    = useState<(Provider & { products: ProviderProduct[]; accounts: ProviderAccount[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/providers/${id}`);
      const json = await res.json();
      setData(json.data ?? null);
    } catch {
      setError("Error al cargar provider");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export function useProviderStats(id: string) {
  const [data,    setData]    = useState<{ total: number; completed: number; failed: number; pending: number; lastError: { error: string; createdAt: string } | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/providers/${id}/stats`)
      .then((r) => r.json())
      .then((j) => setData(j.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading };
}
