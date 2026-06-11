"use client";

import { toast } from "sonner";
import { useCallback } from "react";

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export function useApiError() {
  const handleError = useCallback((error: unknown, context?: string) => {
    let message = "Something went wrong";

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object" && "message" in error) {
      message = (error as ApiError).message;
    }

    const prefix = context ? `${context}: ` : "";
    toast.error(`${prefix}${message}`);

    if (process.env.NODE_ENV === "development") {
      console.error(`[API Error] ${prefix}${message}`, error);
    }

    return message;
  }, []);

  const handleSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const handleInfo = useCallback((message: string) => {
    toast.info(message);
  }, []);

  const handleWarning = useCallback((message: string) => {
    toast.warning(message);
  }, []);

  return { handleError, handleSuccess, handleInfo, handleWarning };
}
