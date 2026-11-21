export interface ProcessedCoverPhoto {
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
  fileName: string;
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DATA_URL_CHARS = 240_000; // ~180 KB binary, well inside Firestore 1 MiB doc limit

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image file. Try a standard JPG, PNG, or WebP photo.'));
    };
    img.src = objectUrl;
  });
}

function renderCoverCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Your browser could not prepare the image preview.');
  }

  // Neutral white backdrop for transparent PNGs
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Center cover-fit crop preserving aspect ratio
  const sourceRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (sourceRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else if (sourceRatio < targetRatio) {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  return canvas;
}

export async function processCoverPhotoFile(file: File): Promise<ProcessedCoverPhoto> {
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image must be 10 MB or smaller.');
  }

  const img = await loadImageFromFile(file);
  if (img.naturalWidth < 200 || img.naturalHeight < 120) {
    throw new Error('Please choose a clearer photo (at least 200 x 120 pixels).');
  }

  const dimensionAttempts: Array<[number, number]> = [
    [1200, 750],
    [960, 600],
    [768, 480],
  ];
  const qualitySteps = [0.84, 0.74, 0.64, 0.52];

  for (const [w, h] of dimensionAttempts) {
    const canvas = renderCoverCanvas(img, w, h);
    for (const quality of qualitySteps) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_DATA_URL_CHARS) {
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        return {
          dataUrl,
          width: w,
          height: h,
          sizeKb: Math.max(1, Math.round(approxBytes / 1024)),
          fileName: file.name,
        };
      }
    }
  }

  throw new Error('This photo is too complex to compress cleanly. Try a smaller JPG or PNG image.');
}
