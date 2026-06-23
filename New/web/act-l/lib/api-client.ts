import { Client, Account, Functions, ExecutionMethod } from 'appwrite';

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

export interface ApiResponse<T = unknown> {
  success: boolean;
  code?: string;
  error?: string;
  data?: T;
  [key: string]: unknown;
}

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

export async function apiRequest<T = unknown>(
  path: string,
  method: string = 'POST',
  body?: Record<string, unknown>,
  requireAuth = true
): Promise<ApiResponse<T>> {
  if (!APPWRITE_CONFIG.functionId) {
    console.warn('NEXT_PUBLIC_APPWRITE_FUNCTION_ID not set — API calls will fail');
    return { success: false, code: 'CONFIG_ERROR', error: 'Function ID not configured' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    try {
      const jwt = await account.createJWT();
      headers['x-appwrite-jwt'] = jwt.jwt;
    } catch {
      return { success: false, code: 'UNAUTHORIZED', error: 'Not authenticated' };
    }
  }

  try {
    const execution = await functions.createExecution({
      functionId: APPWRITE_CONFIG.functionId,
      body: body ? JSON.stringify(body) : undefined,
      async: false,
      xpath: path,
      method: methodToEnum(method),
      headers,
    });

    if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
      const parsed = parseResponseBody(execution.responseBody);
      return {
        success: false,
        code: (parsed.code as string) || 'API_ERROR',
        error: (parsed.error as string) || 'Request failed',
      };
    }

    return parseResponseBody(execution.responseBody) as ApiResponse<T>;
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, code: 'NETWORK_ERROR', error: err.message || 'Network error' };
  }
}

function parseResponseBody(responseBody: string): ApiResponse {
  try {
    return JSON.parse(responseBody || '{}');
  } catch {
    return { success: false, error: 'Invalid response' };
  }
}

export async function createSessionFromSecret(userId: string, secret: string) {
  await account.createSession(userId, secret);
}

export { client };
