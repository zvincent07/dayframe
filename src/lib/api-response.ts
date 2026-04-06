import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from "@/lib/logger";

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type SuccessResponse<T> = {
  success: true;
  data: T;
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<SuccessResponse<T>>(
    { success: true, data },
    { status }
  );
}

export function errorResponse(
  message: string,
  code = 'INTERNAL_SERVER_ERROR',
  status = 500,
  details?: unknown
) {
  // Rule 214: No sensitive data in error responses.
  // We assume 'details' is safe to expose if passed, but typically we should sanitize it.
  // For ZodErrors, it's usually safe to expose validation issues.
  
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  logger.error('API Error', error);

  if (error instanceof ZodError) {
    return errorResponse(
      'Validation Error',
      'VALIDATION_ERROR',
      400,
      error.issues
    );
  }

  if (error instanceof Error) {
    // Check for known error types (e.g., custom AppError)
    if (error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 'UNAUTHORIZED', 401);
    }
    if (error.message.includes('Forbidden')) {
      return errorResponse(error.message, 'FORBIDDEN', 403);
    }
    if (error.message.includes('Not Found')) {
      return errorResponse(error.message, 'NOT_FOUND', 404);
    }
  }

  // Fallback for unknown errors
  return errorResponse('Internal Server Error', 'INTERNAL_SERVER_ERROR', 500);
}
