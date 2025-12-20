import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Loader2 } from 'lucide-react';

interface NekoClientProps {
  nekoUrl: string; // Base URL like http://192.168.12.46:8090
  password: string;
  username?: string;
  width?: number;
  height?: number;
  className?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export interface NekoClientRef {
  navigateToUrl: (url: string) => void;
  sendKeyEvent: (type: 'keydown' | 'keyup', key: string, code: string) => void;
  disconnect: () => void;
}

interface NekoMessage {
  event: string;
  [key: string]: unknown;
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

export const NekoClient = forwardRef<NekoClientRef, NekoClientProps>(
  (
    {
      nekoUrl,
      password,
      username = 'user',
      width = 1920,
      height = 1080,
      className = '',
      onConnected,
      onDisconnected,
      onError,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const tokenRef = useRef<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasControl, setHasControl] = useState(false);

    // Clean up connections
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
      tokenRef.current = null;
      setConnected(false);
      setConnecting(false);
      setHasControl(false);
    }, []);

    // Send message to Neko WebSocket
    const sendMessage = useCallback((msg: NekoMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      }
    }, []);

    // Step 1: HTTP Login to get token, Step 2: WebSocket connection with token
    useEffect(() => {
      if (!containerRef.current) return;

      setConnecting(true);
      setError(null);

      // First, authenticate via HTTP POST to get a token
      const authenticate = async () => {
        try {
          const loginUrl = `${nekoUrl}/api/login`;
          const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: username,
              password: password,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Login failed: ${response.status} - ${errorText}`);
          }

          const data: LoginResponse = await response.json();
          tokenRef.current = data.token;

          // Now connect WebSocket with the token
          const wsProtocol = nekoUrl.startsWith('https') ? 'wss' : 'ws';
          const wsHost = nekoUrl.replace(/^https?:\/\//, '');
          const wsUrl = `${wsProtocol}://${wsHost}/api/ws?token=${encodeURIComponent(data.token)}`;

          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            // WebSocket connected, now wait for server messages
            console.log('Neko WebSocket connected');
          };

          ws.onmessage = async (event) => {
            try {
              const msg = JSON.parse(event.data) as NekoMessage;
              console.log('Neko message received:', msg.event, msg);

              switch (msg.event) {
                case 'system/init': {
                  // Neko v3 init message - setup WebRTC
                  // Client creates the offer and sends to server
                  console.log('Received system/init, creating WebRTC connection');

                  const pc = new RTCPeerConnection({
                    iceServers: [
                      { urls: 'stun:stun.l.google.com:19302' },
                      { urls: 'stun:stun1.l.google.com:19302' },
                    ],
                  });
                  pcRef.current = pc;

                  // Handle incoming video stream
                  pc.ontrack = (e) => {
                    console.log('Received track:', e.track.kind);
                    if (videoRef.current && e.streams[0]) {
                      videoRef.current.srcObject = e.streams[0];
                      setConnected(true);
                      setConnecting(false);
                      onConnected?.();
                    }
                  };

                  // Handle incoming data channel from server
                  pc.ondatachannel = (e) => {
                    console.log('Received data channel:', e.channel.label);
                    dataChannelRef.current = e.channel;

                    e.channel.onopen = () => {
                      console.log('Data channel opened');
                      setHasControl(true);
                    };

                    e.channel.onclose = () => {
                      console.log('Data channel closed');
                      setHasControl(false);
                    };
                  };

                  // Send ICE candidates to server
                  pc.onicecandidate = (e) => {
                    if (e.candidate) {
                      const candidateInit: RTCIceCandidateInit = {
                        candidate: e.candidate.candidate,
                        sdpMid: e.candidate.sdpMid ?? undefined,
                        sdpMLineIndex: e.candidate.sdpMLineIndex ?? undefined,
                        usernameFragment: e.candidate.usernameFragment ?? undefined,
                      };
                      const candidateMsg = {
                        event: 'signal/candidate',
                        data: JSON.stringify(candidateInit),
                      };
                      console.log('Sending ICE candidate');
                      sendMessage(candidateMsg as NekoMessage);
                    }
                  };

                  pc.oniceconnectionstatechange = () => {
                    console.log('ICE connection state:', pc.iceConnectionState);
                    if (
                      pc.iceConnectionState === 'disconnected' ||
                      pc.iceConnectionState === 'failed'
                    ) {
                      setConnected(false);
                      onDisconnected?.();
                    } else if (pc.iceConnectionState === 'connected') {
                      console.log('ICE connected successfully');
                    }
                  };

                  // Add transceiver for receiving video/audio
                  pc.addTransceiver('video', { direction: 'recvonly' });
                  pc.addTransceiver('audio', { direction: 'recvonly' });

                  // Create offer and send to server
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);

                  console.log('Sending signal/offer to server');
                  sendMessage({
                    event: 'signal/offer',
                    sdp: offer.sdp,
                  });
                  break;
                }

                case 'signal/answer': {
                  // Received answer from server
                  console.log('Received signal/answer from server');
                  if (pcRef.current && msg.sdp) {
                    await pcRef.current.setRemoteDescription(
                      new RTCSessionDescription({
                        type: 'answer',
                        sdp: msg.sdp as string,
                      })
                    );
                    console.log('Remote description set successfully');
                  }
                  break;
                }

                case 'signal/candidate': {
                  // Received ICE candidate from server
                  // Neko v3 may send data as JSON string in 'data' field or direct fields
                  if (pcRef.current) {
                    let candidateInit: RTCIceCandidateInit | null = null;

                    if (msg.data && typeof msg.data === 'string') {
                      // Parse from 'data' field (JSON string)
                      try {
                        candidateInit = JSON.parse(msg.data as string);
                      } catch (e) {
                        console.error('Failed to parse ICE candidate data:', e);
                      }
                    } else if (msg.candidate) {
                      // Direct fields at root level
                      candidateInit = {
                        candidate: msg.candidate as string,
                        sdpMid: msg.sdpMid as string | undefined,
                        sdpMLineIndex: msg.sdpMLineIndex as number | undefined,
                      };
                    }

                    if (candidateInit) {
                      console.log('Adding ICE candidate:', JSON.stringify(candidateInit));
                      await pcRef.current.addIceCandidate(
                        new RTCIceCandidate(candidateInit)
                      );
                    }
                  }
                  break;
                }

                case 'system/disconnect': {
                  setConnected(false);
                  setConnecting(false);
                  onDisconnected?.();
                  break;
                }

                case 'system/error': {
                  const errorMsg = (msg.message as string) || 'Connection error';
                  setError(errorMsg);
                  setConnecting(false);
                  onError?.(errorMsg);
                  break;
                }

                case 'control/give': {
                  setHasControl(true);
                  break;
                }

                case 'control/release': {
                  setHasControl(false);
                  break;
                }
              }
            } catch (e) {
              console.error('Failed to parse Neko message:', e);
            }
          };

          ws.onerror = () => {
            setError('WebSocket connection failed');
            setConnecting(false);
            onError?.('WebSocket connection failed');
          };

          ws.onclose = () => {
            setConnected(false);
            setConnecting(false);
            onDisconnected?.();
          };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to authenticate';
          setError(errorMsg);
          setConnecting(false);
          onError?.(errorMsg);
        }
      };

      authenticate();

      return () => {
        cleanup();
      };
    }, [nekoUrl, password, username, cleanup, sendMessage, onConnected, onDisconnected, onError]);

    // Send control event via data channel
    const sendControlEvent = useCallback((type: string, data: object) => {
      if (dataChannelRef.current?.readyState === 'open') {
        const msg = { type, ...data };
        dataChannelRef.current.send(JSON.stringify(msg));
      }
    }, []);

    // Handle mouse events
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (!containerRef.current || !hasControl) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * width);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * height);

        sendControlEvent('mousemove', { x, y });
      },
      [width, height, hasControl, sendControlEvent]
    );

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (!hasControl) return;
        e.preventDefault();
        sendControlEvent('mousedown', { button: e.button });
      },
      [hasControl, sendControlEvent]
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (!hasControl) return;
        e.preventDefault();
        sendControlEvent('mouseup', { button: e.button });
      },
      [hasControl, sendControlEvent]
    );

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        if (!hasControl) return;
        e.preventDefault();
        sendControlEvent('wheel', { x: e.deltaX, y: e.deltaY });
      },
      [hasControl, sendControlEvent]
    );

    // Handle keyboard events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!hasControl) return;
        e.preventDefault();
        sendControlEvent('keydown', { key: e.key, code: e.code });
      },
      [hasControl, sendControlEvent]
    );

    const handleKeyUp = useCallback(
      (e: React.KeyboardEvent) => {
        if (!hasControl) return;
        e.preventDefault();
        sendControlEvent('keyup', { key: e.key, code: e.code });
      },
      [hasControl, sendControlEvent]
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      navigateToUrl: (url: string) => {
        if (!hasControl) return;

        // Send Ctrl+L to focus address bar
        sendControlEvent('keydown', { key: 'l', code: 'KeyL', ctrlKey: true });
        sendControlEvent('keyup', { key: 'l', code: 'KeyL', ctrlKey: true });

        // Small delay then type URL
        setTimeout(() => {
          // Clear existing text with Ctrl+A
          sendControlEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true });
          sendControlEvent('keyup', { key: 'a', code: 'KeyA', ctrlKey: true });

          // Type the URL character by character
          for (const char of url) {
            sendControlEvent('keydown', { key: char, code: `Key${char.toUpperCase()}` });
            sendControlEvent('keyup', { key: char, code: `Key${char.toUpperCase()}` });
          }

          // Press Enter
          setTimeout(() => {
            sendControlEvent('keydown', { key: 'Enter', code: 'Enter' });
            sendControlEvent('keyup', { key: 'Enter', code: 'Enter' });
          }, 50);
        }, 100);
      },

      sendKeyEvent: (type: 'keydown' | 'keyup', key: string, code: string) => {
        if (!hasControl) return;
        sendControlEvent(type, { key, code });
      },

      disconnect: () => {
        cleanup();
      },
    }));

    // Prevent context menu on right-click
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
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-contain"
          style={{ pointerEvents: 'none' }}
        />

        {/* Loading overlay */}
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
            <div className="text-white text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-sm">Connecting to browser session...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
            <div className="text-center">
              <p className="text-red-400 mb-2">Connection Error</p>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Control indicator */}
        {connected && !hasControl && (
          <div className="absolute bottom-4 left-4 bg-yellow-500/90 text-black px-3 py-1.5 rounded-full text-xs font-medium">
            View Only - Request control to interact
          </div>
        )}
      </div>
    );
  }
);

NekoClient.displayName = 'NekoClient';
