function requiredString(config: Record<string, unknown>, key: string, minimum = 1): string {
  const value = config[key];
  if (typeof value !== 'string' || value.length < minimum) {
    throw new Error(`${key} must be at least ${minimum} characters`);
  }
  return value;
}

function duration(config: Record<string, unknown>, key: string, fallback: string): string {
  const value = typeof config[key] === 'string' ? config[key] : fallback;
  if (!/^\d+[smhd]$/.test(value) || Number.parseInt(value, 10) <= 0) {
    throw new Error(`${key} must be a positive duration such as 15m or 30d`);
  }
  return value;
}

function boolean(config: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = config[key];
  if (value === undefined || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`${key} must be true or false`);
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const databaseUrl = requiredString(config, 'DATABASE_URL');
  const accessSecret = requiredString(config, 'JWT_ACCESS_SECRET', 32);
  const refreshSecret = requiredString(config, 'JWT_REFRESH_SECRET', 32);
  if (accessSecret === refreshSecret) throw new Error('JWT secrets must be distinct');

  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL');
  }

  const nodeEnv = typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }
  const corsOrigins = requiredString(config, 'CORS_ORIGINS');
  const origins = corsOrigins.split(',').map((value) => value.trim());
  if (origins.some((origin) => !origin || origin === '*')) {
    throw new Error('CORS_ORIGINS must be an explicit comma-separated allowlist');
  }
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS contains an invalid URL');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/') {
      throw new Error('CORS_ORIGINS entries must be HTTP(S) origins without a path');
    }
    if (nodeEnv === 'production' && url.protocol !== 'https:') {
      throw new Error('Production CORS origins must use HTTPS');
    }
  }

  if (nodeEnv === 'production') {
    if ([accessSecret, refreshSecret].some((value) => value.startsWith('replace_'))) {
      throw new Error('Production authentication secrets must not use example placeholders');
    }
    if (database.password === 'change_me' || /localhost|127\.0\.0\.1/.test(database.hostname)) {
      throw new Error('Production DATABASE_URL must not use example or loopback database settings');
    }
    if (boolean(config, 'ALLOW_DEV_BOOTSTRAP') || boolean(config, 'ALLOW_DEV_SEED')) {
      throw new Error('Development seed/bootstrap controls must be disabled in production');
    }
  }

  const apiPort = Number(config.API_PORT ?? 4000);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65_535) {
    throw new Error('API_PORT must be a valid TCP port');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    JWT_ISSUER: config.JWT_ISSUER ?? 'vendo-api',
    JWT_AUDIENCE: config.JWT_AUDIENCE ?? 'vendo-web',
    API_PORT: apiPort,
    CORS_ORIGINS: origins.join(','),
    ACCESS_TOKEN_TTL: duration(config, 'ACCESS_TOKEN_TTL', '15m'),
    REFRESH_TOKEN_TTL: duration(config, 'REFRESH_TOKEN_TTL', '30d'),
    PASSWORD_RESET_TTL: duration(config, 'PASSWORD_RESET_TTL', '30m'),
    TRUST_PROXY: boolean(config, 'TRUST_PROXY'),
    ALLOW_DEV_BOOTSTRAP: boolean(config, 'ALLOW_DEV_BOOTSTRAP'),
    ALLOW_DEV_SEED: boolean(config, 'ALLOW_DEV_SEED'),
  };
}
