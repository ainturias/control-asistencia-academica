import { Injectable, Logger } from '@nestjs/common';
import { AdminRepository } from '../domain/admin.repository';
import { PasswordHasher } from './password-hasher.port';

export interface DefaultAdminInput {
  email: string;
  password: string;
  fullName: string;
}

/** Crea el administrador inicial si todavía no existe. */
@Injectable()
export class EnsureDefaultAdminUseCase {
  private readonly logger = new Logger(EnsureDefaultAdminUseCase.name);

  constructor(
    private readonly admins: AdminRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: DefaultAdminInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    if (await this.admins.findByEmail(email)) return;
    await this.admins.create({
      email,
      fullName: input.fullName,
      passwordHash: await this.hasher.hash(input.password),
    });
    this.logger.log(`Administrador inicial creado: ${email}`);
  }
}
