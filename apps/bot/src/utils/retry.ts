export type RetryOptions = {
  delayMs?: number;
  factor?: number;
  onRetry?: (error: unknown, attempt: number) => void;
  retries?: number;
  retryCondition?: (error: unknown) => boolean;
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { delayMs = 500, factor = 2, onRetry, retries = 3, retryCondition = () => true } = options;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !retryCondition(error)) {
        throw error;
      }

      onRetry?.(error, attempt);
      const delay = delayMs * factor ** (attempt - 1);
      await sleep(delay);
    }
  }

  // Should never reach here, but makes TS happy
  throw new Error('Retry loop exited unexpectedly');
}
