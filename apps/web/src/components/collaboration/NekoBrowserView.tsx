import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface NekoBrowserViewProps {
  nekoUrl?: string;
  password?: string;
  username?: string;
  className?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

interface LoginResponse {
  id: string;
  token: string;
  profile: {
    name: string;
    is_admin: boolean;
    can_login: boolean;
    can_connect: boolean;
    can_watch: boolean;
    can_host: boolean;
    can_share_media: boolean;
    can_access_clipboard: boolean;
  };
}

export interface NekoBrowserViewRef {
  navigateToUrl: (url: string) => void;
}

/**
 * NekoBrowserView - A minimal browser view component that displays only the Neko browser
 * video stream with mouse/keyboard input. No Neko UI chrome, no user list, no controls.
 * Perfect for embedding a live browser in other UIs like the UI Builder.
 */
export const NekoBrowserView = forwardRef<NekoBrowserViewRef, NekoBrowserViewProps>(function NekoBrowserView({
  nekoUrl = 'http://192.168.12.46:8090',
  password = 'neko-session-password',
  username = 'user',
  className = '',
  onConnected,
  onDisconnected,
  onError,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);

  // Store callbacks in refs to avoid triggering re-renders
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
    onErrorRef.current = onError;
  }, [onConnected, onDisconnected, onError]);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [hasControl, setHasControl] = useState(false);

  // Screen dimensions for coordinate mapping
  const screenWidth = 1920;
  const screenHeight = 1080;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    setHasControl(false);
  }, []);

  // Send WebSocket message
  const sendWsMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Send control event via data channel
  const sendControlEvent = useCallback((type: string, data: object) => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  // Expose navigateToUrl method via ref
  useImperativeHandle(ref, () => ({
    navigateToUrl: (url: string) => {
      if (!hasControl) {
        console.log('[NekoBrowserView] Cannot navigate - no control');
        return;
      }
      console.log('[NekoBrowserView] Navigating to:', url);

      // Simulate Ctrl+L to focus address bar
      sendControlEvent('keydown', { key: 'l', code: 'KeyL', ctrlKey: true });
      sendControlEvent('keyup', { key: 'l', code: 'KeyL', ctrlKey: true });

      // Small delay then type URL and press Enter
      setTimeout(() => {
        // Clear any existing text with Ctrl+A
        sendControlEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true });
        sendControlEvent('keyup', { key: 'a', code: 'KeyA', ctrlKey: true });

        // Type URL character by character
        for (const char of url) {
          sendControlEvent('keydown', { key: char, code: `Key${char.toUpperCase()}` });
          sendControlEvent('keyup', { key: char, code: `Key${char.toUpperCase()}` });
        }

        // Press Enter after a short delay
        setTimeout(() => {
          sendControlEvent('keydown', { key: 'Enter', code: 'Enter' });
          sendControlEvent('keyup', { key: 'Enter', code: 'Enter' });
        }, 50);
      }, 100);
    }
  }), [hasControl, sendControlEvent]);

  // Connect to Neko
  const connect = useCallback(async () => {
    // Prevent double-connections
    if (connectingRef.current) {
      console.log('[NekoBrowserView] Already connecting, skipping');
      return;
    }
    connectingRef.current = true;

    cleanup();
    setStatus('connecting');
    setError(null);

    try {
      // Step 1: HTTP login to get token
      const loginUrl = `${nekoUrl}/api/login`;
      console.log('[NekoBrowserView] Logging in to:', loginUrl);
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} - ${errorText}`);
      }

      const data: LoginResponse = await response.json();
      console.log('[NekoBrowserView] Login successful, got token');

      // Check if component is still mounted
      if (!mountedRef.current) {
        console.log('[NekoBrowserView] Component unmounted during login, aborting');
        connectingRef.current = false;
        return;
      }

      // Step 2: Connect WebSocket with token
      const wsProtocol = nekoUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = nekoUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsHost}/api/ws?token=${encodeURIComponent(data.token)}`;

      console.log('[NekoBrowserView] Connecting WebSocket to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[NekoBrowserView] WebSocket connected, waiting for system/init');
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('[NekoBrowserView] WS message:', msg.event);

          switch (msg.event) {
            case 'system/init': {
              console.log('[NekoBrowserView] Got system/init, creating WebRTC connection');
              // Create WebRTC peer connection
              const pc = new RTCPeerConnection({
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                ],
              });
              pcRef.current = pc;

              // Create data channel for sending control events
              const dataChannel = pc.createDataChannel('data');
              dataChannelRef.current = dataChannel;
              dataChannel.onopen = () => {
                console.log('[NekoBrowserView] Data channel opened');
                // Request control after data channel is open
                sendWsMessage({ event: 'control/request' });
              };
              dataChannel.onclose = () => {
                console.log('[NekoBrowserView] Data channel closed');
                setHasControl(false);
              };
              dataChannel.onerror = (e) => {
                console.error('[NekoBrowserView] Data channel error:', e);
              };

              // Handle incoming video/audio stream
              pc.ontrack = (e) => {
                console.log('[NekoBrowserView] Got video track');
                if (videoRef.current && e.streams[0]) {
                  videoRef.current.srcObject = e.streams[0];
                  setStatus('connected');
                  connectingRef.current = false;
                  onConnectedRef.current?.();
                }
              };

              // Also handle server-created data channels (fallback)
              pc.ondatachannel = (e) => {
                console.log('[NekoBrowserView] Received data channel from server');
                if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
                  dataChannelRef.current = e.channel;
                  e.channel.onopen = () => {
                    console.log('[NekoBrowserView] Server data channel opened');
                    sendWsMessage({ event: 'control/request' });
                  };
                  e.channel.onclose = () => setHasControl(false);
                }
              };

              // Send ICE candidates
              pc.onicecandidate = (e) => {
                if (e.candidate) {
                  sendWsMessage({
                    event: 'signal/candidate',
                    data: JSON.stringify({
                      candidate: e.candidate.candidate,
                      sdpMid: e.candidate.sdpMid ?? undefined,
                      sdpMLineIndex: e.candidate.sdpMLineIndex ?? undefined,
                    }),
                  });
                }
              };

              pc.oniceconnectionstatechange = () => {
                console.log('[NekoBrowserView] ICE connection state:', pc.iceConnectionState);
                if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                  setStatus('disconnected');
                  onDisconnected?.();
                }
              };

              // Add transceivers for receiving
              pc.addTransceiver('video', { direction: 'recvonly' });
              pc.addTransceiver('audio', { direction: 'recvonly' });

              // Create and send offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendWsMessage({ event: 'signal/offer', sdp: offer.sdp });
              break;
            }

            case 'signal/answer': {
              if (pcRef.current && msg.sdp) {
                await pcRef.current.setRemoteDescription(
                  new RTCSessionDescription({ type: 'answer', sdp: msg.sdp })
                );
              }
              break;
            }

            case 'signal/candidate': {
              if (pcRef.current) {
                let candidateInit = null;
                if (msg.data && typeof msg.data === 'string') {
                  try {
                    candidateInit = JSON.parse(msg.data);
                  } catch {
                    // ignore parse errors
                  }
                } else if (msg.candidate) {
                  candidateInit = {
                    candidate: msg.candidate,
                    sdpMid: msg.sdpMid,
                    sdpMLineIndex: msg.sdpMLineIndex,
                  };
                }
                if (candidateInit) {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(candidateInit));
                }
              }
              break;
            }

            case 'system/disconnect':
              console.log('[NekoBrowserView] Got system/disconnect');
              setStatus('disconnected');
              connectingRef.current = false;
              onDisconnectedRef.current?.();
              break;

            case 'system/error':
              console.log('[NekoBrowserView] Got system/error:', msg.message);
              setError(msg.message || 'Connection error');
              setStatus('error');
              connectingRef.current = false;
              onErrorRef.current?.(msg.message || 'Connection error');
              break;

            case 'control/give':
              console.log('[NekoBrowserView] Got control/give - we now have control');
              setHasControl(true);
              break;

            case 'control/release':
              console.log('[NekoBrowserView] Got control/release - we lost control');
              setHasControl(false);
              break;

            case 'control/locked':
              console.log('[NekoBrowserView] Got control/locked - someone else has control');
              // Someone else has control, we need to wait or request again
              break;

            case 'session/state':
              // Initial session state from server
              console.log('[NekoBrowserView] Got session/state');
              break;
          }
        } catch (e) {
          console.error('[NekoBrowserView] Message parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('[NekoBrowserView] WebSocket error:', e);
        setError('WebSocket connection failed');
        setStatus('error');
        connectingRef.current = false;
        onErrorRef.current?.('WebSocket connection failed');
      };

      ws.onclose = (event) => {
        console.log('[NekoBrowserView] WebSocket closed - code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean);
        // Only update state if we're not unmounting
        if (mountedRef.current) {
          setStatus('disconnected');
          connectingRef.current = false;
          onDisconnectedRef.current?.();
        }
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      console.error('[NekoBrowserView] Connection error:', errorMsg);
      setError(errorMsg);
      setStatus('error');
      connectingRef.current = false;
      onErrorRef.current?.(errorMsg);
    }
  }, [nekoUrl, password, username, cleanup, sendWsMessage]);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;
    console.log('[NekoBrowserView] Component mounted, starting connection');
    connect();
    return () => {
      console.log('[NekoBrowserView] Component unmounting, cleaning up');
      mountedRef.current = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nekoUrl, password, username]);

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !hasControl) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * screenWidth);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * screenHeight);
    sendControlEvent('mousemove', { x, y });
  }, [hasControl, sendControlEvent]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!hasControl) return;
    e.preventDefault();
    sendControlEvent('mousedown', { button: e.button });
  }, [hasControl, sendControlEvent]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!hasControl) return;
    e.preventDefault();
    sendControlEvent('mouseup', { button: e.button });
  }, [hasControl, sendControlEvent]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!hasControl) return;
    e.preventDefault();
    sendControlEvent('wheel', { x: e.deltaX, y: e.deltaY });
  }, [hasControl, sendControlEvent]);

  // Keyboard event handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!hasControl) return;
    e.preventDefault();
    sendControlEvent('keydown', { key: e.key, code: e.code });
  }, [hasControl, sendControlEvent]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (!hasControl) return;
    e.preventDefault();
    sendControlEvent('keyup', { key: e.key, code: e.code });
  }, [hasControl, sendControlEvent]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative bg-gray-900 overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%' }}
      tabIndex={0}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={handleContextMenu}
    >
      {/* Video element - the browser view */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-contain"
        style={{ pointerEvents: 'none' }}
      />

      {/* Loading overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-white text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm">Connecting to browser...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-medium mb-2">Connection Error</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <button
              onClick={connect}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Disconnected overlay */}
      {status === 'disconnected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Browser disconnected</p>
            <button
              onClick={connect}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
