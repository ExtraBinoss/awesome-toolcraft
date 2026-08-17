const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}` || "/";
}

export function withoutBasePath(path: string): string {
  if (!basePath || !path.startsWith(basePath)) return path;
  return path.slice(basePath.length) || "/";
}
