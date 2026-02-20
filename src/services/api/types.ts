export type ApiRequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
};

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};
