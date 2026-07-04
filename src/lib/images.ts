const STORAGE_PREFIX = "https://firebasestorage.googleapis.com/v0/b/";

export function getResizedUrl(originalUrl: string, size: "200x200" | "600x600" | "1920"): string {
  if (!originalUrl || !originalUrl.startsWith(STORAGE_PREFIX)) return originalUrl;

  const oIndex = originalUrl.indexOf("/o/");
  if (oIndex === -1) return originalUrl;

  const beforePath = originalUrl.slice(0, oIndex + 3);
  const afterO = originalUrl.slice(oIndex + 3);

  const qIndex = afterO.indexOf("?");
  const encodedPath = qIndex === -1 ? afterO : afterO.slice(0, qIndex);
  const queryString = qIndex === -1 ? "" : afterO.slice(qIndex);

  const decodedPath = decodeURIComponent(encodedPath);
  const lastDot = decodedPath.lastIndexOf(".");
  const dotIndex = lastDot === -1 || lastDot < decodedPath.lastIndexOf("/") ? -1 : lastDot;

  const newPath = dotIndex === -1
    ? `${decodedPath}_${size}.webp`
    : decodedPath.slice(0, dotIndex) + `_${size}.webp`;
  const newEncodedPath = encodeURIComponent(newPath);

  return beforePath + newEncodedPath + queryString;
}

export function preloadImage(url: string): void {
  if (!url) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  document.head.appendChild(link);
}
