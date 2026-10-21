import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { RealtimeEvent, RealtimeEvents } from '../../application/realtime.port';

/** Nombre del evento que escucha el cliente. */
export const CHANGED_EVENT = 'changed';

export const realtimeRooms = {
  admins: 'admins',
  module: (moduleId: number) => `module:${moduleId}`,
  student: (studentId: number) => `student:${studentId}`,
};

/**
 * Adaptador de Socket.IO. El gateway le entrega el servidor al iniciar; antes de eso
 * (o en pruebas sin gateway) los eventos simplemente no se envían.
 */
@Injectable()
export class SocketIoRealtimeEvents extends RealtimeEvents {
  private readonly logger = new Logger(SocketIoRealtimeEvents.name);
  private server: Server | null = null;

  attach(server: Server) {
    this.server = server;
  }

  toAdmins(event: RealtimeEvent) {
    this.emit(realtimeRooms.admins, event);
  }

  toModuleStudents(moduleId: number, event: RealtimeEvent) {
    this.emit(realtimeRooms.module(moduleId), event);
  }

  toStudent(studentId: number, event: RealtimeEvent) {
    this.emit(realtimeRooms.student(studentId), event);
  }

  toEveryone(event: RealtimeEvent) {
    this.emit(null, event);
  }

  private emit(room: string | null, event: RealtimeEvent) {
    if (!this.server) return;
    try {
      (room ? this.server.to(room) : this.server).emit(CHANGED_EVENT, event);
    } catch (error) {
      this.logger.error(`No se pudo enviar el evento ${event.action}`, error);
    }
  }
}
