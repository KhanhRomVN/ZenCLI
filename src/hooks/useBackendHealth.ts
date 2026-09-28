import { useState, useEffect, useCallback, useRef } from "react";
import { getApiUrl } from "../services/api";

const HEALTH_ENDPOINT = "/v1/health";
const CHECK_INTERVAL = 5000; // 5 seconds
const TIMEOUT_MS = 2000;

interface BackendHealthState {
  /** Whether the backend is reachable and healthy */
  isConnected: boolean;
  /** Whether a manual recheck is in progress */
  isChecking: boolean;
  /** Manually trigger a health check (e.g. after changing API URL) */
  recheck: () => void;
}

/**
 * Polls the backend /v1/health endpoint every 5 seconds.
 * Returns connection status for UI feedback (red border, blocked input).
 *
 * Optimized: only sets isChecking during manual rechecks to avoid
 * triggering re-renders on every automated poll cycle.
 */
export function useBackendHealth(): BackendHealthState {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const mountedRef = useRef(true);

  const checkConnection = useCallback(async (showCheckingUI = false) => {
    if (showCheckingUI && mountedRef.current) {
      setIsChecking(true);
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${getApiUrl()}${HEALTH_ENDPOINT}`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      if (res.ok) {
        const data = (await res.json()) as { status?: string };
        const connected = data.status === "ok";
        setIsConnected((prev) => (prev === connected ? prev : connected));
      } else {
        setIsConnected((prev) => (prev === false ? prev : false));
      }
    } catch {
      if (!mountedRef.current) return;
      setIsConnected((prev) => (prev === false ? prev : false));
    } finally {
      if (showCheckingUI && mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, []);

  // Initial check + polling interval
  useEffect(() => {
    mountedRef.current = true;
    checkConnection();
    const interval = setInterval(checkConnection, CHECK_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [checkConnection]);

  const recheck = useCallback(() => {
    checkConnection(true);
  }, [checkConnection]);

  return { isConnected, isChecking, recheck };
}