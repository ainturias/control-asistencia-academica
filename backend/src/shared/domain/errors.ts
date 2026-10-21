export type DomainErrorKind =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly kind = 'NOT_FOUND';
}

export class ConflictError extends DomainError {
  readonly kind = 'CONFLICT';
}

export class BusinessRuleError extends DomainError {
  readonly kind = 'BUSINESS_RULE';
}

export class UnauthorizedError extends DomainError {
  readonly kind = 'UNAUTHORIZED';
}

export class ForbiddenError extends DomainError {
  readonly kind = 'FORBIDDEN';
}

export class ValidationError extends DomainError {
  readonly kind = 'VALIDATION';
}
