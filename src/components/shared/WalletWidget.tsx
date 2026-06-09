"use client";

import Link from "next/link";
import { Coins, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export default function WalletWidget() {
  const { wallet, monthly, loading } = useWallet();

  const items = [
    {
      label: "Balance actual",
      value: wallet?.balance ?? 0,
      icon:  Wallet,
      color: "#e67e22",
      bg:    "rgba(230,126,34,0.10)",
      border:"rgba(230,126,34,0.20)",
    },
    {
      label: "Créditos este mes",
      value: monthly?.added ?? 0,
      icon:  TrendingUp,
      color: "#27ae60",
      bg:    "rgba(39,174,96,0.10)",
      border:"rgba(39,174,96,0.20)",
    },
    {
      label: "Consumidos este mes",
      value: monthly?.removed ?? 0,
      icon:  TrendingDown,
      color: "#e74c3c",
      bg:    "rgba(192,57,43,0.10)",
      border:"rgba(192,57,43,0.20)",
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-semibold text-foreground">Créditos</p>
        </div>
        <Link
          href="/resellers"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Gestionar →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {items.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="p-4 flex items-center gap-3">
            {loading ? (
              <div className="skeleton h-12 w-full rounded-lg" />
            ) : (
              <>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
