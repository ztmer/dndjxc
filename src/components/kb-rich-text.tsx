import { parseKbRichText } from "@/lib/kb-rich-text";

export function KbRichText({ text, className }: { text: string; className?: string }) {
  const blocks = parseKbRichText(text);
  return (
    <div className={className ?? "space-y-3 text-sm leading-6"}>
      {blocks.map((b, i) =>
        b.type === "image" ? (
          <img
            key={`${b.src}-${i}`}
            src={b.src}
            alt={b.alt || "示意图"}
            className="max-h-80 w-full max-w-2xl rounded-lg border border-gray-200 bg-white object-contain"
          />
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}
