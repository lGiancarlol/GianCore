"use client";
import { useEffect, useState, useCallback } from "react";
import type { Wallet, CreditTransaction } from "@/types";

interface MonthlyStats {
  added:   number;
  removed: number;
  balance: number;
}

export function useWallet() {
  const [wallet,  setWallet]  = useState<Wallet | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    setLoading(true);
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((r) => {
        setWallet(r.data?.wallet  ?? null);
        setMonthly(r.data?.monthly ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { wallet, monthly, loading, refresh: fetch_ };
}

export function useWalletTransactions(userId?: string, limit = 50) {
  const [data,    setData]    = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (userId) params.set("userId", userId);
    fetch(`/api/wallet/transactions?${params}`)
      .then((r) => r.json())
      .then((r) => setData(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, limit]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refresh: fetch_ };
}
