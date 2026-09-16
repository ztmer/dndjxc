import { cn } from "@/lib/utils";

export function SiteBrandMark({
  title,
  logoSrc,
  size = "md",
  inverse = false,
  className,
}: {
  title: string;
  logoSrc?: string;
  size?: "sm" | "md" | "lg";
  inverse?: boolean;
  className?: string;
}) {
  const box = size === "lg" ? "size-12" : size === "sm" ? "size-9" : "size-[30px]";
  const text = size === "lg" ? "text-xl md:text-[22px]" : size === "sm" ? "text-base" : "text-[15px]";
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoSrc} alt="" className={cn(box, "shrink-0 rounded-md object-contain bg-white")} />
      ) : (
        <div
          className={cn(
            box,
            "flex shrink-0 items-center justify-center rounded-md text-sm font-bold",
            inverse ? "bg-sidebar-primary text-white" : "bg-primary text-primary-foreground",
          )}
        >
          店
        </div>
      )}
      <p className={cn("min-w-0 truncate font-bold leading-tight", text, inverse ? "text-white" : "text-foreground")}>
        {title}
      </p>
    </div>
  );
}
