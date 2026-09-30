/**
 * Réduit une photo avant envoi à l'IA (plus rapide, moins de données,
 * sous la limite de taille de Vercel). Renvoie du JPEG en base64.
 */
export async function imageToBase64(file: File, maxSide = 1600, quality = 0.85): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // format non décodable par le navigateur : on envoie tel quel
    return { base64: await fileToBase64(file), mimeType: file.type || "image/jpeg" };
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion impossible"))), "image/jpeg", quality),
  );
  return { base64: await fileToBase64(blob), mimeType: "image/jpeg" };
}

function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
