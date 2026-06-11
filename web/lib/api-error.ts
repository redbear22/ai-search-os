import { toast } from "sonner";

export const API_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function toastApiError(message = API_ERROR_MESSAGE): void {
  toast.error(message);
}
