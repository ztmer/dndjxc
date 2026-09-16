"use client";

import { acceptProject, startProject } from "@/actions/service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function StartProjectButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      onClick={async () => {
        const r = await startProject(id);
        if (r.ok) {
          toast.success("已开工");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      开工
    </Button>
  );
}

export function AcceptButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        const r = await acceptProject(id);
        if (r.ok) {
          toast.success("已验收，质保起算");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      验收
    </Button>
  );
}
