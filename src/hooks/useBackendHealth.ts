/**
 * ------------------------------------------------------------------
 * useBackendHealth Hook
 * ------------------------------------------------------------------
 * Giám sát tình trạng kết nối với Server Backend theo chu kỳ định kỳ.
 * Cung cấp trạng thái `isConnected` để điều khiển giao diện người dùng (ẩn/hiện cảnh báo, khóa input).
 *
 * Main features:
 * - Tự động ping endpoint `/v1/health` mỗi 5 giây
 * - Hỗ trợ Timeout 2 giây để tránh treo request
 * - Cơ chế Manual Recheck (`recheck()`) để refresh tức thời khi đổi cấu hình
 * - Tối ưu hóa Render: Chỉ hiển thị spinner khi user chủ động bấm nút kiểm tra lại
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback, useRef } from "react";

// ── Services ──
import { getApiUrl } from "../services/api.js";

// ─── Constants ─────────────────────────────────────────────────────────
const HEALTH_ENDPOINT = "/v1/health";
const CHECK_INTERVAL = 5000; // 5 seconds
const TIMEOUT_MS = 2000;

// ─── Interfaces ────────────────────────────────────────────────────────
interface BackendHealthState {
  /** Whether the backend is reachable and healthy */
  isConnected: boolean;
  /** Whether a manual recheck is in progress */
  isChecking: boolean;
  /** Manually trigger a health check (e.g. after changing API URL) */
  recheck: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────
/**
 * Polls the backend /v1/health endpoint every 5 seconds.
 * Returns connection status for UI feedback (red border, blocked input).
 *
 * Optimized: only sets isChecking during manual rechecks to avoid
 * triggering re-renders on every automated poll cycle.
 */
export function useBackendHealth(): BackendHealthState {
  // ── State ──
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  
  // ── Refs ──
  const mountedRef = useRef(true);

  // ── Callbacks ──
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

  // ── Effects ──
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