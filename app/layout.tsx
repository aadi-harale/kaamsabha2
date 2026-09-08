import "./globals.css";
import "./polish.css";
import "./map.css";
import "./final.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KaamSabha — Worker-Owned Local Services",
  description: "SIH26089 cooperative household and community services marketplace with fair, explainable worker-owned dispatch"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
