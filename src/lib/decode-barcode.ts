import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.CODABAR,
];

export function zxingHints() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

const NATIVE_FORMATS = [
  "code_128",
  "code_39",
  "code_93",
  "ean_13",
  "ean_8",
  "itf",
  "qr_code",
  "data_matrix",
  "codabar",
];

type Detector = {
  detect: (src: ImageBitmap | HTMLCanvasElement) => Promise<{ rawValue: string }[]>;
};

function nativeDetector(): Detector | null {
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: NATIVE_FORMATS });
  } catch {
    return null;
  }
}

function drawScaled(bitmap: ImageBitmap, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function drawCenterCrop(bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas");
  const w = Math.round(bitmap.width * 0.72);
  const h = Math.round(bitmap.height * 0.4);
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(
    bitmap,
    Math.round((bitmap.width - w) / 2),
    Math.round((bitmap.height - h) / 2),
    w,
    h,
    0,
    0,
    w,
    h,
  );
  return canvas;
}

async function detectCanvas(detector: Detector | null, canvas: HTMLCanvasElement) {
  if (detector) {
    try {
      const codes = await detector.detect(canvas);
      const text = codes[0]?.rawValue?.trim();
      if (text) return text;
    } catch {
      /* 继续走 ZXing */
    }
  }
  try {
    const reader = new BrowserMultiFormatReader(zxingHints());
    return reader.decodeFromCanvas(canvas).getText().trim() || null;
  } catch {
    return null;
  }
}

/** 手机拍照图往往过大、带旋转，缩小后再识码。 */
export async function decodeBarcodeFromFile(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const detector = nativeDetector();
    try {
      const codes = await detector?.detect(bitmap);
      const text = codes?.[0]?.rawValue?.trim();
      if (text) return text;
    } catch {
      /* 缩小后再试 */
    }
    const canvases = [1600, 1000, 640]
      .map((edge) => drawScaled(bitmap, edge))
      .filter((c): c is HTMLCanvasElement => !!c);
    const crop = drawCenterCrop(bitmap);
    if (crop) canvases.push(crop);
    for (const canvas of canvases) {
      const text = await detectCanvas(detector, canvas);
      if (text) return text;
    }
    return null;
  } finally {
    bitmap.close();
  }
}
