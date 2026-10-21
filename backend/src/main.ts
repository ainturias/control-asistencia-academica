import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/infrastructure/http/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // La activación envía la lista completa (posiblemente editada) de estudiantes y fechas como JSON.
  app.useBodyParser('json', { limit: '10mb' });
  const config = app.get(ConfigService);

  const origins = config.get<string>('CORS_ORIGIN', 'http://localhost:5173').split(',');
  app.setGlobalPrefix('api');
  app.enableCors({ origin: origins, exposedHeaders: ['Content-Disposition'] });
  // El WebSocket (tiempo real) corre en el mismo puerto, con los mismos orígenes permitidos.
  app.useWebSocketAdapter(new CorsIoAdapter(app, origins));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());

  await app.listen(config.get<number>('PORT', 3000));
}
class CorsIoAdapter extends IoAdapter {
  constructor(
    app: NestExpressApplication,
    private readonly origins: string[],
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, { ...options, cors: { origin: this.origins } } as ServerOptions);
  }
}

void bootstrap();
