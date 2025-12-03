import { ChromaSettings } from "../types";

// Helper to convert Hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 255, b: 0 };
}

export const processChromaKey = (
  imageSrc: string,
  settings: ChromaSettings
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject("Canvas context not found");
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const target = hexToRgb(settings.color);
      
      // Pre-calculate squared similarity threshold for performance
      // Max Euclidean distance in RGB is sqrt(255^2 * 3) approx 441.
      const distThreshold = settings.similarity * 441.67; 
      const spillThreshold = distThreshold + (settings.smoothness * 100);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Euclidean distance in RGB space
        const distance = Math.sqrt(
          (r - target.r) ** 2 +
          (g - target.g) ** 2 +
          (b - target.b) ** 2
        );

        if (distance < distThreshold) {
          // Exact match within tolerance -> transparent
          data[i + 3] = 0; 
        } else if (distance < spillThreshold) {
          // Edge feathering / Spill removal
          // Calculate alpha based on how far it is from the threshold
          const alpha = (distance - distThreshold) / (spillThreshold - distThreshold);
          data[i + 3] = Math.floor(alpha * 255);
          
          // Simple spill suppression: desaturate slightly if it's close to the color
          // This is a naive implementation but works for basic cases
          // data[i+1] = Math.min(data[i+1], data[i+3]); 
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};