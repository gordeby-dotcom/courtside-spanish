import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cancha | Courtside Spanish",
  description: "Short basketball-themed Spanish drills for the current class topic.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
