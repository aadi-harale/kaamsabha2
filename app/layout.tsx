import "./globals.css";
import "./polish.css";
import "./map.css";
import "./final.css";
import "./ops.css";
import "./overrides.css";
import "./product.css";
import "./payment-scope.css";
import "./help.css";
import "./worker-demo.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KaamSabha — Worker-Owned Local Services",
  description: "SIH26089 cooperative household and community services marketplace with fair, explainable worker-owned dispatch"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
