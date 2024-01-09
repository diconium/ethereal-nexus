import { ZodError } from 'zod';

export function actionError(message: string) {
  return {
    success: false,
    error: {
      message
    }
  };
}

export function actionZodError(message: string, zodError: ZodError) {
  const error = zodError.issues;
  return {
    success: false,
    error: {
      message,
      issues: error.map((issue) => ({
        message: issue.message,
        path: issue.path
      }))
    }
  };
}

export function actionSuccess<T>(data: T) {
  return {
    success: true,
    data
  } as const;
}