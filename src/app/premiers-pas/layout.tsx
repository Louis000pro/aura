import { noindexEcranApp } from "@/lib/noindexEcranApp";

export const metadata = noindexEcranApp("Bienvenue");

export default function PremiersPasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
