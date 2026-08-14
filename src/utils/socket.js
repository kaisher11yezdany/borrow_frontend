import io from 'socket.io-client';

let socket = null;

export function initSocket() {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
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
