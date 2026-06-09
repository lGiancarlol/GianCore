"use client";
import { useEffect, useState } from "react";

export function useLogs(limit = 50, offset = 0) {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/logs?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((r) => setData(r.data ?? []))
      .catch(() => setError("Error al cargar logs"))
      .finally(() => setLoading(false));
  }, [limit, offset]);

  return { data, loading, error };
}
