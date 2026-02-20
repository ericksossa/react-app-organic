import { ApiError } from '../../services/api/types';

function isApiError(value: unknown): value is ApiError {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { message?: unknown }).message === 'string' &&
      typeof (value as { status?: unknown }).status === 'number'
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
