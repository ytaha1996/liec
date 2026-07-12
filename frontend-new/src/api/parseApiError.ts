import { humanizeStatusInText } from '@/helpers/humanize-status';

// Mirrors the GateError shape returned by the .NET backend when a photo
// compliance check blocks a transition.
export type GateError = {
  code: 'PHOTO_GATE_FAILED';
  message: string;
  missing: Array<{ packageId: number; customerName?: string; stage: string }>;
};

export interface ApiErrorPayload {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
}

// Thrown by `unwrap()` for non-2xx responses; caught by pages for toasts.
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.status = payload.status ?? 0;
    this.code = payload.code;
    this.details = payload.details;
    this.name = 'ApiError';
  }
}

export const parseApiError = (e: unknown): ApiErrorPayload => {
  if (e instanceof ApiError) {
    return {
      status: e.status,
      code: e.code,
      message: humanizeStatusInText(e.message) || 'Unknown error',
      details: e.details,
    };
  }
  if (e instanceof Error) {
    return { message: humanizeStatusInText(e.message) || 'Unknown error' };
  }
  return { message: 'Unknown error' };
};
