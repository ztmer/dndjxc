"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { decodeBarcodeFromFile, zxingHints } from "@/lib/decode-barcode";
import { ScanLineIcon } from "lucide-react";
import { toast } from "sonner";

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

async function openRearCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("no-media"), { name: "NotSupportedError" });
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

function cameraHint(err: unknown) {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError") return "没有摄像头权限。请在系统设置里允许后重试，或点「关闭」再用扫码拍一张。";
  if (name === "NotFoundError") return "没找到摄像头。请用扫码拍一张。";
  return "实时预览打不开。请点关闭，再用「扫码」拍一张。";
}

export function CameraScanButton({ onScan, compact }: { onScan: (text: string) => void; compact?: boolean }) {
  const scanFileId = useId();
  const albumId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [mounted, setMounted] = useState(false);
  const [secure, setSecure] = useState(false);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState("");

  useEffect(() => {
    setMounted(true);
    setSecure(window.isSecureContext);
  }, []);

  function closeLive() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    stopTracks(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setLive(false);
    setCamError("");
  }

  async function startLiveScan() {
    setCamError("");
    setLive(true);
    try {
      const stream = await openRearCamera();
      if (streamRef.current) stopTracks(streamRef.current);
      streamRef.current = stream;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const video = videoRef.current;
      if (!video) {
        stopTracks(stream);
        setCamError("画面没准备好，请再点一次扫码。");
        return;
      }
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      const reader = new BrowserMultiFormatReader(zxingHints());
      controlsRef.current = await reader.decodeFromStream(stream, video, (result) => {
        if (!result) return;
        const text = result.getText().trim();
        if (!text) return;
        closeLive();
        onScanRef.current(text);
      });
    } catch (e) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      stopTracks(streamRef.current);
      streamRef.current = null;
      setCamError(cameraHint(e));
    }
  }

  async function onPhoto(file: File) {
    setBusy(true);
    toast.message("正在识码…");
    try {
      const text = await decodeBarcodeFromFile(file);
      if (!text) throw new Error("empty");
      closeLive();
      onScan(text);
    } catch {
      toast.error("没认出条码。条码要拍清楚、尽量占满画面，或改手输。");
    } finally {
      setBusy(false);
    }
  }

  const overlay =
    mounted && secure
      ? createPortal(
          <div
            className={live ? "shop-phone-overlay" : "pointer-events-none invisible fixed inset-0 h-0 w-0 overflow-hidden"}
            role="dialog"
            aria-modal={live}
            aria-label="扫码"
          >
            <video ref={videoRef} className="min-h-0 flex-1 bg-black object-cover" muted playsInline autoPlay />
            {live ? (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-[72%] rounded-lg border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
                <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                  <Button type="button" variant="secondary" className="h-11 px-4" onClick={closeLive}>
                    关闭
                  </Button>
                  <p className="text-sm">对准条码</p>
                  <span className="w-16" />
                </div>
                {camError ? (
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-xl bg-black/80 p-4 text-center text-sm leading-6">
                    {camError}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={compact ? "flex shrink-0 items-stretch gap-1" : "flex w-full items-stretch gap-2"}>
      {secure ? (
        <Button
          type="button"
          className={compact ? "h-11 gap-1 px-3" : "h-12 min-h-12 flex-1 gap-2 text-base"}
          disabled={busy}
          onClick={() => void startLiveScan()}
        >
          <ScanLineIcon className={compact ? "size-4" : "size-5"} />
          扫码
        </Button>
      ) : (
        <label
          htmlFor={scanFileId}
          className={
            compact
              ? "inline-flex h-11 cursor-pointer items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
              : "inline-flex h-12 min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 text-base font-medium text-primary-foreground"
          }
        >
          <ScanLineIcon className={compact ? "size-4" : "size-5"} />
          扫码
        </label>
      )}
      <input
        id={scanFileId}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={busy}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onPhoto(file);
        }}
      />
      <label
        htmlFor={albumId}
        className={
          compact
            ? "flex h-11 shrink-0 cursor-pointer items-center rounded-lg border px-2.5 text-sm text-muted-foreground"
            : "flex h-12 min-h-12 shrink-0 cursor-pointer items-center rounded-lg border px-3 text-sm text-muted-foreground"
        }
      >
        拍照
      </label>
      <input
        id={albumId}
        type="file"
        accept="image/*"
        disabled={busy}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onPhoto(file);
        }}
      />
      {overlay}
    </div>
  );
}
