export type ImageQuality = {
  resolusiCukup: boolean;
  buram: boolean;
  silau: boolean;
  width: number;
  height: number;
  laplacianVariance: number;
  glareRatio: number;
};

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
const MIN_BLUR_VARIANCE = 35;
const MAX_GLARE_RATIO = 0.08;

export async function prepareImage(file: Blob): Promise<Blob> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Gambar tidak dapat dikompresi.")), "image/jpeg", JPEG_QUALITY));
}

export async function inspectImageQuality(file: Blob): Promise<ImageQuality> {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const luminance: number[] = [];
  let glarePixels = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const value = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    luminance.push(value);
    if (value > 245) glarePixels += 1;
  }
  const variance = laplacianVariance(luminance, canvas.width, canvas.height);
  return { resolusiCukup: Math.max(image.naturalWidth, image.naturalHeight) >= 800, buram: variance < MIN_BLUR_VARIANCE, silau: glarePixels / luminance.length > MAX_GLARE_RATIO, width: image.naturalWidth, height: image.naturalHeight, laplacianVariance: variance, glareRatio: glarePixels / luminance.length };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gambar tidak dapat dibaca.")); };
    image.src = url;
  });
}

function laplacianVariance(values: number[], width: number, height: number): number {
  const samples: number[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = y * width + x;
      samples.push(values[center - width] + values[center - 1] + values[center + 1] + values[center + width] - 4 * values[center]);
    }
  }
  if (samples.length === 0) return 0;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;
}
