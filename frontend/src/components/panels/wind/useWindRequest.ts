import { useCallback, useState } from "react";

export function useWindRequest<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await request();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    result,
    error,
    run,
    setError,
    setResult,
  };
}
