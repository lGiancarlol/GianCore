"use client";
import { useEffect, useState } from "react";

export function useLicenses() {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/licenses")
      .then((r) => r.json())
      .then((r) => setData(r.data ?? []))
      .catch(() => setError("Error al cargar licencias"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
