import { Logger } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import {
  realtimeRooms,
  SocketIoRealtimeEvents,
} from '../../../../shared/infrastructure/realtime/socket-io-realtime-events';
import { TokenService } from '../../application/token-service.port';

/** Ruta del WebSocket; va bajo /api para que el proxy de Vite y el del servidor la traten igual. */
export const REALTIME_PATH = '/api/socket.io';

/**
 * Conexión en tiempo real. Valida el mismo token de la API y agrupa a cada usuario en salas:
 * los administradores juntos y cada estudiante en la de su módulo y la suya propia.
 */
@WebSocketGateway({ path: REALTIME_PATH })
export class RealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly tokens: TokenService,
    private readonly events: SocketIoRealtimeEvents,
  ) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch(() => next(new Error('UNAUTHORIZED')));
    });
    this.events.attach(server);
    this.logger.log(`Tiempo real disponible en ${REALTIME_PATH}`);
  }

  private async authenticate(socket: Socket) {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof token !== 'string' || !token) throw new Error('Sin token');
    const user: AuthUser = await this.tokens.verify(token);
    if (user.role === 'ADMIN') {
      await socket.join(realtimeRooms.admins);
    } else {
      const rooms = [realtimeRooms.student(user.id)];
      if (user.moduleId !== null) rooms.push(realtimeRooms.module(user.moduleId));
      await socket.join(rooms);
    }
  }
}
