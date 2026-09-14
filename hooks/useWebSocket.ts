import {useCallback, useEffect, useRef, useState} from 'react';

export type MessageType = 'message' | 'system' | 'error' | 'joinConfirmed' | 'userList';

export interface ChatMessage {
  id: string;
  type: MessageType;
  username?: string;
  text?: string;
  timestamp: string;
  users?: string[];
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface UseWebSocketOptions {
  url: string;
  maxRetries?: number;
}

interface UseWebSocketReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  joinChat: (username: string) => void;
  disconnect: () => void;
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  onlineUsers: string[];
  error: string | null;
}

/**
 * Custom hook for managing a WebSocket connection to the chat server.
 * Handles connection lifecycle, reconnection with exponential backoff,
 * message parsing, and clean unmount.
 */
export function useWebSocket({
  url,
  maxRetries = 3,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const usernameRef = useRef<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus(
      retryCountRef.current > 0 ? 'reconnecting' : 'connecting',
    );
    setError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useWebSocket] Connected');
        setConnectionStatus('connected');
        retryCountRef.current = 0;

        // Re-join if we had a username (reconnection scenario)
        if (usernameRef.current) {
          ws.send(JSON.stringify({type: 'join', username: usernameRef.current}));
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.type === 'userList') {
            setOnlineUsers(data.users || []);
            return;
          }

          if (data.type === 'error') {
            setError(data.text || 'Unknown error');
            return;
          }

          if (data.type === 'joinConfirmed') {
            // Add system message locally
            setMessages(prev => [
              ...prev,
              {
                id: generateId(),
                type: 'system',
                text: 'You joined the chat',
                timestamp: data.timestamp,
              },
            ]);
            return;
          }

          // Regular message or system message
          const chatMessage: ChatMessage = {
            id: generateId(),
            type: data.type,
            username: data.username,
            text: data.text,
            timestamp: data.timestamp || new Date().toISOString(),
          };

          setMessages(prev => [...prev, chatMessage]);
        } catch (e) {
          console.warn('[useWebSocket] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[useWebSocket] Disconnected');
        setConnectionStatus('disconnected');

        // Attempt reconnection if not intentional
        if (!intentionalCloseRef.current && retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
          console.log(
            `[useWebSocket] Reconnecting in ${delay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`,
          );
          retryCountRef.current += 1;
          retryTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        console.error('[useWebSocket] Connection error');
        setError('Connection error');
      };
    } catch (e) {
      console.error('[useWebSocket] Failed to create WebSocket:', e);
      setConnectionStatus('disconnected');
      setError('Failed to connect');
    }
  }, [url, maxRetries, generateId]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
    retryCountRef.current = 0;
  }, []);

  const joinChat = useCallback(
    (username: string) => {
      usernameRef.current = username;
      intentionalCloseRef.current = false;
      retryCountRef.current = 0;

      // Connect if not already connected
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        connect();
      } else {
        wsRef.current.send(JSON.stringify({type: 'join', username}));
      }
    },
    [connect],
  );

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({type: 'message', text}));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    messages,
    sendMessage,
    joinChat,
    disconnect,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    onlineUsers,
    error,
  };
}
