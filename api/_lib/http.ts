export interface ApiRequest {
  method?: string;
  url?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
  end: (body?: string) => void;
}

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export const parseBody = <T>(body: unknown): T => {
  if (!body) return {} as T;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  if (typeof body === 'object') return body as T;
  return {} as T;
};

export const getQueryParam = (req: ApiRequest, name: string): string | undefined => {
  const fromQuery = req.query?.[name];
  if (typeof fromQuery === 'string') return fromQuery;
  if (Array.isArray(fromQuery)) return fromQuery[0];
  if (!req.url) return undefined;
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get(name) ?? undefined;
  } catch {
    return undefined;
  }
};

export const sendError = (res: ApiResponse, error: unknown): void => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error('[api] erreur inattendue', error);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
};
