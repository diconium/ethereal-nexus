/**
 * A generic debounce function that delays the execution of a callback
 * until after a specified delay time has elapsed since the last invocation.
 *
 * @param callback - The function to debounce.
 * @param delay - The number of milliseconds to delay.
 * @returns A debounced version of the provided function with a `cancel` method.
 */
export function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  callback: F,
  delay: number,
): {
  (...args: Parameters<F>): void;
  cancel: () => void;
} {
  let timeout: ReturnType<typeof setTimeout>;

  const debouncedFunction = (...args: Parameters<F>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), delay);
  };

  // Add a cancel method to clear the timeout
  debouncedFunction.cancel = () => {
    clearTimeout(timeout);
  };

  return debouncedFunction;
}
