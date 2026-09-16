import { cn } from "@/lib/utils";
import type { JobStep } from "@/lib/job-flow";

export function JobFlowBar({ steps }: { steps: JobStep[] }) {
  return (
    <ol
      className={cn(
        "grid gap-2",
        steps.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
      )}
    >
      {steps.map((s, i) => (
        <li
          key={s.key}
          className={cn(
            "rounded-xl border px-3 py-2",
            s.state === "done" && "border-primary/40 bg-primary/5",
            s.state === "current" && "border-primary bg-background shadow-sm",
            s.state === "todo" && "border-dashed text-muted-foreground",
          )}
        >
          <div className="text-xs text-muted-foreground">
            {i + 1}. {s.state === "done" ? "已完成" : s.state === "current" ? "进行中" : "未到"}
          </div>
          <div className="font-medium">{s.label}</div>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.hint}</p>
        </li>
      ))}
    </ol>
  );
}
