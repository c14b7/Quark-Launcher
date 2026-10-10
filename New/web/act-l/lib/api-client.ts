import { Client, Account, Functions, ExecutionMethod } from 'appwrite';
import { track, logTelemetry } from './telemetry/client';

export const APPWRITE_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '680d15210002f3f65ea9',
  functionId: process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID || '',
};

const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

export const account = new Account(client);
const functions = new Functions(client);

/** Base envelope; payload fields from T are merged at top level by Function responses. */
export type ApiResponse<T extends object = Record<string, never>> = {
  success: boolean;
  code?: string;
  error?: string;
  data?: T;
} & Partial<T>;

function methodToEnum(method: string): ExecutionMethod {
  const map: Record<string, ExecutionMethod> = {
    GET: ExecutionMethod.GET,
    POST: ExecutionMethod.POST,
    PATCH: ExecutionMethod.PATCH,
    PUT: ExecutionMethod.PUT,
    DELETE: ExecutionMethod.DELETE,
  };
  return map[method.toUpperCase()] || ExecutionMethod.POST;
}

function fail<T extends object>(code: string, error: string): ApiResponse<T> {
  return { success: false, code, error } as ApiResponse<T>;
}

export async function apiRequest<T extends object = Record<string, never>>(
  path: string,
  method: string = 'POST',
  body?: Record<string, unknown>,
  requireAuth = true
): Promise<ApiResponse<T>> {
  if (!APPWRITE_CONFIG.functionId) {
    console.warn('[API] NEXT_PUBLIC_APPWRITE_FUNCTION_ID not set');
    return fail<T>('CONFIG_ERROR', 'Function ID not configured');
  }

  const httpMethod = method.toUpperCase();
  const startedAt = Date.now();

  if (requireAuth) {
    try {
      await account.get();
    } catch {
      return fail<T>('UNAUTHORIZED', 'Not authenticated');
    }
  }

  try {
    // Always include _route in body so Function routing works even when xpath is empty.
    // Appwrite accepts a body on GET executions for this purpose.
    const routePayload = { ...(body || {}), _route: path };
    const execution = await functions.createExecution({
      functionId: APPWRITE_CONFIG.functionId,
      body: JSON.stringify(routePayload),
      async: false,
      xpath: path,
      method: methodToEnum(httpMethod),
    });

    if (execution.status === 'failed') {
      const parsed = parseResponseBody(execution.responseBody || execution.errors || '');
      const errMsg =
        (parsed.error as string) ||
        execution.errors ||
        execution.responseBody ||
        'Function execution failed';
      console.error(`[API] ${httpMethod} ${path} failed (status=${execution.status}):`, errMsg);
      if (!path.startsWith('/telemetry')) {
        track('error.api', { path, code: 'FUNCTION_ERROR', latencyMs: Date.now() - startedAt }, 'error');
        logTelemetry('error', `API ${path} failed`, { path, status: execution.status });
      }
      return fail<T>((parsed.code as string) || 'FUNCTION_ERROR', errMsg);
    }

    if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
      const parsed = parseResponseBody(execution.responseBody);
      console.warn(`[API] ${httpMethod} ${path} → ${execution.responseStatusCode}`, parsed);
      if (!path.startsWith('/telemetry')) {
        track(
          'error.api',
          { path, code: (parsed.code as string) || 'API_ERROR', latencyMs: Date.now() - startedAt },
          'error'
        );
      }
      return fail<T>(
        (parsed.code as string) || 'API_ERROR',
        (parsed.error as string) || 'Request failed'
      );
    }

    return parseResponseBody(execution.responseBody) as ApiResponse<T>;
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number; type?: string };
    console.error(`[API] ${httpMethod} ${path} exception:`, err.message || error);
    if (!path.startsWith('/telemetry')) {
      track('error.api', { path, code: 'NETWORK_ERROR', latencyMs: Date.now() - startedAt }, 'error');
      logTelemetry('warn', `API network error: ${path}`, { message: err.message });
    }
    return fail<T>('NETWORK_ERROR', err.message || 'Network error');
  }
}

function parseResponseBody(responseBody: string): Record<string, unknown> {
  try {
    return JSON.parse(responseBody || '{}') as Record<string, unknown>;
  } catch {
    return { success: false, error: 'Invalid response' };
  }
}

export async function createSessionFromSecret(userId: string, secret: string) {
  await account.createSession(userId, secret);
}

export { client };
