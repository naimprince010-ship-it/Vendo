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
        CORS_ORIGINS: 'https://pos.example.com',
      }),
    ).toThrow('Production authentication secrets');
  });

  it('rejects unsafe production origins, database settings, and development controls', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://vendo:strong-password@db.internal:5432/vendo',
      JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
      JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
      CORS_ORIGINS: 'https://pos.example.com',
    };
    expect(() => validateEnvironment(production)).not.toThrow();
    expect(() => validateEnvironment({ ...production, CORS_ORIGINS: '*' })).toThrow(
      'explicit comma-separated allowlist',
    );
    expect(() =>
      validateEnvironment({ ...production, CORS_ORIGINS: 'http://pos.example.com' }),
    ).toThrow('must use HTTPS');
    expect(() =>
      validateEnvironment({
        ...production,
        DATABASE_URL: 'postgresql://vendo:change_me@localhost/vendo',
      }),
    ).toThrow('database settings');
    expect(() => validateEnvironment({ ...production, ALLOW_DEV_SEED: 'true' })).toThrow(
      'must be disabled',
    );
  });

  it('rejects reused secrets and malformed runtime values', () => {
    const secret = 'one-secret-with-at-least-32-characters';
    const base = {
      DATABASE_URL: 'postgresql://vendo:password@localhost:5432/vendo',
      JWT_ACCESS_SECRET: secret,
      JWT_REFRESH_SECRET: 'different-secret-with-at-least-32-chars',
      CORS_ORIGINS: 'http://localhost:3000',
    };
    expect(() => validateEnvironment({ ...base, JWT_REFRESH_SECRET: secret })).toThrow('distinct');
    expect(() => validateEnvironment({ ...base, ACCESS_TOKEN_TTL: 'forever' })).toThrow(
      'positive duration',
    );
    expect(() => validateEnvironment({ ...base, API_PORT: '70000' })).toThrow('valid TCP port');
  });

  it('contains no credential logging statements in authentication services', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'auth', 'auth.service.ts'), 'utf8');
    expect(source).not.toMatch(/console\.(log|info|debug|warn|error)/);
    expect(source).not.toMatch(/Logger\.(log|debug|verbose).*password/i);
  });
});
