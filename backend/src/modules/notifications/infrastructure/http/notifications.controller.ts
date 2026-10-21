import { Controller, Get, HttpCode, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import { Notifier } from '../../application/notifier.service';

@Controller('notifications')
@Roles('ADMIN', 'STUDENT')
export class NotificationsController {
  constructor(private readonly notifier: Notifier) {}

  @Get()
  feed(@CurrentUser() user: AuthUser, @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number) {
    return this.notifier.feed(user, moduleId);
  }

  /** Marca como leídas todas las notificaciones del módulo hasta ahora. */
  @Post('seen')
  @HttpCode(204)
  async seen(@CurrentUser() user: AuthUser, @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number) {
    await this.notifier.markSeen(user, moduleId);
  }
}
