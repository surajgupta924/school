import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

/**
 * Returns a shared Socket.IO connection authenticated with the given access token.
 * Reconnects from scratch whenever the token changes (e.g. after a silent refresh).
 */
export function getSocket(token) {
  if (!token) return null;

  if (socket && currentToken === token) {
    if (socket.disconnected) socket.connect();
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io('/', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  currentToken = null;
}

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
