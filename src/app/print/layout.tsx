import { requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export default async function PrintGroupLayout({ children }: { children: React.ReactNode }) {
  await requireSession("/print");
  return children;
}
