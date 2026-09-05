import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateEnvironment } from '../config/environment';
import { durationSeconds } from './duration';

describe('authentication security regression', () => {
  it('parses explicit token lifetimes safely', () => {
    expect(durationSeconds('15m')).toBe(900);
    expect(durationSeconds('30d')).toBe(2_592_000);
    expect(() => durationSeconds('forever')).toThrow('Invalid duration');
  });

  it('rejects missing or weak authentication secrets', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'postgresql://local', JWT_ACCESS_SECRET: 'short' }),
    ).toThrow();
  });

  it('rejects example authentication secrets in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://local',
        JWT_ACCESS_SECRET: 'replace_with_at_least_32_random_characters',
        JWT_REFRESH_SECRET: 'replace_with_a_different_32_character_secret',
      }),
    ).toThrow('Production authentication secrets');
  });

  it('contains no credential logging statements in authentication services', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'auth', 'auth.service.ts'), 'utf8');
    expect(source).not.toMatch(/console\.(log|info|debug|warn|error)/);
    expect(source).not.toMatch(/Logger\.(log|debug|verbose).*password/i);
  });
});
