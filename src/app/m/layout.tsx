import { requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export default async function MobileGroupLayout({ children }: { children: React.ReactNode }) {
  await requireSession("/m");
  return children;
}
