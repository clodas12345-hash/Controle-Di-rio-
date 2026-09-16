export const CLOUD_SHARED_URL = "https://ais-pre-sno7apz6fxtgjpabxlrnia-473118395752.us-west2.run.app";
export const CLOUD_DEV_URL = "https://ais-dev-sno7apz6fxtgjpabxlrnia-473118395752.us-west2.run.app";
export const BACKUP_RENDER_URL = "https://controle-di-rio.onrender.com";

export function isMobileOrNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    window.location.protocol === 'ionic:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    Boolean((window as any).Android) ||
    /android|iphone|ipad|ipod/i.test(navigator.userAgent || '')
  );
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isMobileOrNativeApp()) {
    return `${CLOUD_SHARED_URL}${cleanPath}`;
  }
  return cleanPath;
}

/**
 * Robust fetch that handles both Web (relative) and Android APK (Capacitor/WebView)
 * with automatic fallback between endpoints if one fails or returns HTML instead of JSON.
 */
export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isMobile = isMobileOrNativeApp();

  const candidates: string[] = [];

  if (isMobile) {
    // Android APK / Capacitor - Public Shared Cloud Run first, then Dev URL, then Backup
    candidates.push(`${CLOUD_SHARED_URL}${cleanPath}`);
    candidates.push(`${CLOUD_DEV_URL}${cleanPath}`);
    candidates.push(`${BACKUP_RENDER_URL}${cleanPath}`);
    candidates.push(cleanPath);
  } else {
    // Browser - Relative path first, then Public Shared Cloud Run, then Dev URL
    candidates.push(cleanPath);
    candidates.push(`${CLOUD_SHARED_URL}${cleanPath}`);
    candidates.push(`${CLOUD_DEV_URL}${cleanPath}`);
  }

  let lastError: any = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, options);
      
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      // If endpoint returned HTML (e.g. index.html due to SPA routing or WebView local asset fallback),
      // ignore this candidate and try the next live backend URL.
      if (
        contentType.includes("text/html") || 
        text.trim().toLowerCase().startsWith("<!doctype") || 
        text.trim().toLowerCase().startsWith("<html")
      ) {
        console.warn(`[fetchApi] URL ${url} retornou página HTML em vez de JSON. Tentando próximo endpoint...`);
        continue;
      }

      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        console.warn(`[fetchApi] Falha ao fazer parse de JSON na resposta de ${url}`);
        continue;
      }

      // Return valid JSON Response object
      return new Response(JSON.stringify(parsedJson), {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      lastError = err;
      console.warn(`[fetchApi] Falha de rede ao tentar ${url}:`, err);
    }
  }

  throw lastError || new Error("Não foi possível conectar ao servidor de IA. Verifique sua conexão com a internet.");
}

