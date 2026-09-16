"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

const VIEW = 280;
const OUT = 800;

function loadFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("读图失败"));
    };
    img.src = url;
  });
}

function dropDraft(img: HTMLImageElement | null) {
  if (img?.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
}

export function ProductImageField({ value, onChange }: Props) {
  const albumRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const [bright, setBright] = useState(100);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  function openDraft(img: HTMLImageElement) {
    const min = Math.min(img.naturalWidth, img.naturalHeight);
    const cover = VIEW / Math.max(min, 1);
    setDraft(img);
    setScale(Math.max(cover, 0.2));
    setRot(0);
    setBright(100);
    setOx(0);
    setOy(0);
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      openDraft(await loadFile(file));
    } catch {
      toast.error("这张图打不开，换一张");
    }
  }

  function drawToCanvas(size: number) {
    if (!draft) return null;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.filter = `brightness(${bright}%)`;
    const k = size / VIEW;
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale * k, scale * k);
    ctx.translate(ox / scale, oy / scale);
    ctx.drawImage(draft, -draft.naturalWidth / 2, -draft.naturalHeight / 2);
    ctx.filter = "none";
    return c;
  }

  async function confirm() {
    const c = drawToCanvas(OUT);
    if (!c) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", 0.82));
      if (!blob) throw new Error("导出失败");
      const fd = new FormData();
      fd.append("file", blob, "p.jpg");
      const res = await fetch("/api/product-images", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "上传失败");
      onChange(data.url);
      dropDraft(draft);
      setDraft(null);
      toast.success("商品图已上传");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>商品图</FieldLabel>
      <p className="text-xs text-muted-foreground">只要一张正面图。手机可拍照，确定前可裁切、旋转、调亮度。</p>
      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-24 w-24 rounded-lg border bg-muted object-contain" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
            无图
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => albumRef.current?.click()}>
            相册选图
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => cameraRef.current?.click()}>
            拍照
          </Button>
          {value ? (
            <Button type="button" variant="ghost" className="h-11" onClick={() => onChange("")}>
              去掉图
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={albumRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {draft ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50 p-3 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 rounded-xl border bg-background p-4">
            <p className="font-medium">修商品图</p>
            <div
              className="relative mx-auto overflow-hidden rounded-lg border bg-muted"
              style={{ width: VIEW, height: VIEW, touchAction: "none" }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                drag.current = { x: e.clientX, y: e.clientY, ox, oy };
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                setOx(drag.current.ox + (e.clientX - drag.current.x));
                setOy(drag.current.oy + (e.clientY - drag.current.y));
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: draft.naturalWidth,
                  height: draft.naturalHeight,
                  transform: `translate(-50%, -50%) translate(${ox}px, ${oy}px) rotate(${rot}deg) scale(${scale})`,
                  filter: `brightness(${bright}%)`,
                }}
              />
            </div>
            <label className="text-sm">
              放大
              <input
                type="range"
                className="mt-1 w-full"
                min={0.2}
                max={4}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              亮度
              <input
                type="range"
                className="mt-1 w-full"
                min={60}
                max={140}
                step={1}
                value={bright}
                onChange={(e) => setBright(Number(e.target.value))}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setRot((r) => (r + 270) % 360)}>
                左转
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setRot((r) => (r + 90) % 360)}>
                右转
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                disabled={busy}
                onClick={() => {
                  dropDraft(draft);
                  setDraft(null);
                }}
              >
                取消
              </Button>
              <Button type="button" className="h-11 flex-1" disabled={busy} onClick={() => void confirm()}>
                {busy ? "上传中…" : "确定上传"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
