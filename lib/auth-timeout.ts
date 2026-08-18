const DEFAULT_AUTH_TIMEOUT_MS = 15_000;

/** Keep an unavailable account service from trapping the desktop UI in a
 * permanent loading state. The underlying request may finish later, but the
 * form is released immediately so the user can retry without restarting. */
export async function withAuthTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
  message = "The account service took too long to respond. Check your connection and try again.",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
