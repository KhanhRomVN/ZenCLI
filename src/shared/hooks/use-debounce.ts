import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for debouncing values
 * @param value The value to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear the previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set a new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debouncing function calls
 * @param callback The function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

/**
 * Custom hook for throttling function calls
 * @param callback The function to throttle
 * @param delay Delay in milliseconds
 * @returns Throttled function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      // If there's a pending timer, clear it
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Schedule the call for after the delay
      timerRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * Custom hook for memoizing with deep comparison
 * @param value The value to memoize
 * @param compare Optional custom compare function
 * @returns Memoized value
 */
export function useDeepMemo<T>(
  value: T,
  compare: (a: T, b: T) => boolean = deepEqual
): T {
  const [memoizedValue, setMemoizedValue] = useState<T>(value);

  useEffect(() => {
    if (!compare(value, memoizedValue)) {
      setMemoizedValue(value);
    }
  }, [value, memoizedValue, compare]);

  return memoizedValue;
}

/**
 * Custom hook for managing local storage
 * @param key Storage key
 * @param initialValue Initial value
 * @returns [storedValue, setValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Custom hook for managing session storage
 * @param key Storage key
 * @param initialValue Initial value
 * @returns [storedValue, setValue]
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Custom hook for handling window resize events
 * @returns Window dimensions
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call once to set initial size

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

/**
 * Custom hook for detecting clicks outside an element
 * @param ref Reference to the element
 * @param handler Callback function when clicked outside
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

/**
 * Custom hook for handling keyboard shortcuts
 * @param key Keyboard key to listen for
 * @param callback Function to call when key is pressed
 * @param options Additional options
 */
export function useKeyPress(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: {
    target?: HTMLElement | Window;
    preventDefault?: boolean;
    event?: "keydown" | "keyup" | "keypress";
  } = {}
) {
  const {
    target = window,
    preventDefault = false,
    event = "keydown",
  } = options;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === key) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    target.addEventListener(event, handleKey as EventListener);

    return () => {
      target.removeEventListener(event, handleKey as EventListener);
    };
  }, [key, callback, target, preventDefault, event]);
}

/**
 * Custom hook for handling escape key press
 * @param callback Function to call when escape is pressed
 */
export function useEscapeKey(callback: () => void) {
  useKeyPress("Escape", () => callback(), { preventDefault: true });
}

/**
 * Custom hook for handling enter key press
 * @param callback Function to call when enter is pressed
 */
export function useEnterKey(callback: () => void) {
  useKeyPress("Enter", () => callback(), { preventDefault: true });
}

// Helper functions

/**
 * Deep equality check for objects
 */
function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;

  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return a === b;
  }

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}
