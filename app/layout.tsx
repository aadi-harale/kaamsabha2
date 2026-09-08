import "./globals.css";
import "./polish.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KaamSabha — Cooperative Services",
  description: "SIH26089 cooperative gig services platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
