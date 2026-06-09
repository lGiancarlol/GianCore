import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title:       "GianCore — Platform",
  description: "Núcleo central de gestión: licencias, productos, bots y automatizaciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased`}
        suppressHydrationWarning>
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
