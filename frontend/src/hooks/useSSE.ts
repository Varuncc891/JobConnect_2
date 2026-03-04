import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface UseSSEOptions {
  url: string;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  autoConnect?: boolean;
  showToasts?: boolean;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastMessage: any;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useSSE = (options: UseSSEOptions): UseSSEReturn => {
  const { url, onMessage, onError, onOpen, autoConnect = true, showToasts = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>();
  const reconnectAttempts = useRef(0);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
  }, [onMessage, onError, onOpen]);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

    try {
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        if (showToasts) toast.success("🔔 Live updates connected");
        onOpenRef.current?.();
      };

      eventSource.onmessage = (event) => {
        try {
          if (event.data === ":keepalive" || event.data.startsWith(":")) return;
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessageRef.current?.(data);
        } catch (error) {
          console.error("SSE: Error parsing message", error);
        }
      };

      eventSource.onerror = (error) => {
        if (eventSource.readyState === EventSource.CLOSED) {
          setIsConnected(false);
          if (reconnectAttempts.current < 5) {
            reconnectAttempts.current++;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => connect(), 3000 * reconnectAttempts.current);
          }
        }
        onErrorRef.current?.(error);
      };
    } catch (error) {
      console.error("SSE: Failed to create connection", error);
    }
  }, [url, showToasts]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [autoConnect]);

  return { isConnected, lastMessage, connect, disconnect, reconnect };
};