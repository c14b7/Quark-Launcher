export interface FunctionRequest {
  path?: string;
  method?: string;
  payload?: string;
  body?: string;
  bodyRaw?: string;
  bodyText?: string;
  bodyJson?: unknown;
  headers?: Record<string, string>;
  url?: string;
}

export interface FunctionResponse {
  json: (body: unknown, status?: number) => unknown;
  text?: (body: string, status?: number) => unknown;
}

export interface FunctionContext {
  req: FunctionRequest;
  res: FunctionResponse;
  log: (message: string) => void;
  error: (message: string) => void;
}

export function createLogger(log?: (msg: string) => void, error?: (msg: string) => void) {
  const prefix = '[QuarkAPI]';
  return {
    log: (msg: string) => (log ? log(`${prefix} ${msg}`) : console.log(`${prefix} ${msg}`)),
    error: (msg: string) => (error ? error(`${prefix} ${msg}`) : console.error(`${prefix} ${msg}`)),
  };
}

export function formatError(err: unknown): string {
  if (err instanceof Error) return `${err.message}${err.stack ? `\n${err.stack}` : ''}`;
  return String(err);
}
