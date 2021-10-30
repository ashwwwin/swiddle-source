import socket, { Server as SocketServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import ListenerService from '@/Services/ListenerService'

class Socket {
  private static io: SocketServer

  static boot (http: HttpServer) {
    Socket.setupSocket(http)
    Socket.setupListeners()
    Socket.setupService()
  }

  private static setupSocket (http: HttpServer): void {
    this.io = socket(http, {
      pingTimeout: 60000,
      pingInterval: 30000,
    })
  }

  private static setupListeners (): void {
    this.io.on('connection', client => ListenerService.onConnection(client))
  }

  private static setupService (): void {
    ListenerService.setSocketServer(this.io)
  }
}

export default Socket
