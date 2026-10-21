import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnsureDefaultAdminUseCase } from '../application/ensure-default-admin.use-case';

@Injectable()
export class DefaultAdminSeeder implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    private readonly ensureDefaultAdmin: EnsureDefaultAdminUseCase,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    await this.ensureDefaultAdmin.execute({
      email,
      password,
      fullName: this.config.get<string>('ADMIN_NAME', 'Administrador'),
    });
  }
}
