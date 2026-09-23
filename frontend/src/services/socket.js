import { io } from 'socket.io-client'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const socketUrl = apiUrl.replace(/\/api\/?$/, '')

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket'],
})

export function connectSocket() {
  if (!socket.connected) socket.connect()
  return socket
}
