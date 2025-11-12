import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io({ withCredentials: true });
  }
  return socket;
}

export type JobUpdateListener = (payload: any) => void;

const listeners = new Map<string, Set<JobUpdateListener>>();

export function subscribeToJob(jobId: string, listener: JobUpdateListener) {
  if (!listeners.has(jobId)) {
    listeners.set(jobId, new Set());
  }
  listeners.get(jobId)!.add(listener);
  const socket = getSocket();
  socket.emit('join', jobId);

  const handler = (payload: any) => {
    if (payload.id === jobId) {
      listener(payload);
    }
  };
  socket.on('progress', handler);

  return () => {
    listeners.get(jobId)?.delete(listener);
    socket.off('progress', handler);
  };
}
