import { toast } from "sonner";

export async function apiCall<T>(
  url: string,
  options?: RequestInit & {
    errorContext?: string;
    showSuccess?: boolean;
    successMessage?: string;
  }
): Promise<T | null> {
  const { errorContext, showSuccess, successMessage, ...fetchOptions } =
    options || {};

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (showSuccess && successMessage) {
      toast.success(successMessage);
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    toast.error(errorContext ? `${errorContext}: ${message}` : message);
    console.error(`API Error [${url}]:`, error);
    return null;
  }
}
