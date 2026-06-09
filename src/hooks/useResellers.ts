"use client";
import { useEffect, useState } from "react";

export function useResellers() {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/resellers")
      .then((r) => r.json())
      .then((r) => setData(r.data ?? []))
      .catch(() => setError("Error al cargar revendedores"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
