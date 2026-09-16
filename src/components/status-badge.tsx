import { Badge } from "@/components/ui/badge";
import { DOC_STATUS, label } from "@/lib/labels";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "submitted" || status === "confirmed" ? "default" : status === "voided" ? "destructive" : "secondary";
  return <Badge variant={variant}>{label(DOC_STATUS, status)}</Badge>;
}
