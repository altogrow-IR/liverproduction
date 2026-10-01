import { MAX_IMAGE_BYTES } from "./media.ts";
export interface Crop {
  zoom: number;
  x: number;
  y: number;
}
export const defaultCrop = (): Crop => ({ zoom: 1, x: 0, y: 0 });
export function drawCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  crop: Crop,
  fit: boolean,
) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const scale =
    (fit ? Math.min : Math.max)(
      w / image.naturalWidth,
      h / image.naturalHeight,
    ) * crop.zoom;
  const iw = image.naturalWidth * scale,
    ih = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    (w - iw) / 2 + ((crop.x / 100) * w) / 2,
    (h - ih) / 2 + ((crop.y / 100) * h) / 2,
    iw,
    ih,
  );
}
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    throw Error(
      "画像を読み込めませんでした。別のPNG・JPEG・WebP画像を選んでください。",
    );
  }
  return image;
}
export async function importImage(file: File) {
  if (
    !/^image\/(png|jpeg|webp)$/.test(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw Error("PNG・JPEG・WebPの10MB以下の画像を選んでください。");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth * image.naturalHeight > 20000000)
      throw Error(
        "画像が大きすぎます。2000万画素以下に縮小して選んでください。",
      );
    return url;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
export async function cropBlob(
  url: string,
  crop: Crop,
  kind: "portrait" | "badge" | "figure",
) {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = kind === "portrait" ? 768 : 256;
  canvas.height = kind === "portrait" ? 1024 : kind === "figure" ? 352 : 256;
  for (let i = 0; i < 5; i++) {
    drawCrop(canvas, image, crop, kind === "figure");
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(Error("画像を調整できませんでした。")),
        "image/png",
      ),
    );
    if (blob.size <= MAX_IMAGE_BYTES) return blob;
    canvas.width = Math.floor(canvas.width * 0.75);
    canvas.height = Math.floor(canvas.height * 0.75);
  }
  throw Error("画像を小さくして、もう一度選んでください。");
}
