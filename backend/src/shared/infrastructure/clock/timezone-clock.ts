import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Clock } from '../../application/clock.port';

@Injectable()
export class TimezoneClock extends Clock {
  private readonly formatter: Intl.DateTimeFormat;
  private readonly timeFormatter: Intl.DateTimeFormat;
  private readonly zone: string;

  constructor(config: ConfigService) {
    super();
    this.zone = config.get<string>('APP_TZ', 'America/La_Paz');
    // en-CA formatea como YYYY-MM-DD
    this.formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    this.timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  }

  get timeZone(): string {
    return this.zone;
  }

  now(): Date {
    return new Date();
  }

  today(): string {
    return this.toLocalDate(this.now());
  }

  toLocalDate(instant: Date): string {
    return this.formatter.format(instant);
  }

  currentTime(): string {
    return this.timeFormatter.format(this.now()).slice(0, 5);
  }

  secondsSinceMidnight(): number {
    const [h, m, s] = this.timeFormatter.format(this.now()).split(':').map(Number);
    return h * 3600 + m * 60 + s;
  }
}
