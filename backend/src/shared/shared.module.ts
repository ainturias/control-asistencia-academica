import { Global, Module } from '@nestjs/common';
import { Clock } from './application/clock.port';
import { RealtimeEvents } from './application/realtime.port';
import { TimezoneClock } from './infrastructure/clock/timezone-clock';
import { SocketIoRealtimeEvents } from './infrastructure/realtime/socket-io-realtime-events';

@Global()
@Module({
  providers: [
    { provide: Clock, useClass: TimezoneClock },
    SocketIoRealtimeEvents,
    { provide: RealtimeEvents, useExisting: SocketIoRealtimeEvents },
  ],
  exports: [Clock, RealtimeEvents, SocketIoRealtimeEvents],
})
export class SharedModule {}
