import io from 'socket.io-client';

let socket = null;

export function initSocket() {
  if (socket) return socket;

  // Same origin by default so a deployed build talks to whatever host served
  // it (nginx proxies /socket.io through to the backend) — in dev that is
  // Vite's own proxy. Set VITE_API_ORIGIN, the same variable the REST client
  // uses, only when the backend lives on a different host.
  socket = io(import.meta.env.VITE_API_ORIGIN || undefined, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Connected to real-time updates');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from real-time updates');
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
