import { WIND_API_BASE } from "./windConstants";

type ApiErrorResponse = {
  detail?: string;
};

export async function postWindJson<T>(
  endpoint: string,
  payload: unknown,
  fallbackMessage: string,
): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${WIND_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const errorData = (await response.json()) as ApiErrorResponse;
      if (errorData?.detail) {
        message = errorData.detail;
      }
    } catch {}
    throw new Error(message);
  }

  return (await response.json()) as T;
}
