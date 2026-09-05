function requiredString(config: Record<string, unknown>, key: string, minimum = 1): string {
  const value = config[key];
  if (typeof value !== 'string' || value.length < minimum) {
    throw new Error(`${key} must be at least ${minimum} characters`);
  }
  return value;
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  requiredString(config, 'DATABASE_URL');
  requiredString(config, 'JWT_ACCESS_SECRET', 32);
  requiredString(config, 'JWT_REFRESH_SECRET', 32);

  const nodeEnv = typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development';
  if (
    nodeEnv === 'production' &&
    [config.JWT_ACCESS_SECRET, config.JWT_REFRESH_SECRET].some(
      (value) => typeof value === 'string' && value.startsWith('replace_'),
    )
  ) {
    throw new Error('Production authentication secrets must not use example placeholders');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    JWT_ISSUER: config.JWT_ISSUER ?? 'vendo-api',
    JWT_AUDIENCE: config.JWT_AUDIENCE ?? 'vendo-web',
    ACCESS_TOKEN_TTL: config.ACCESS_TOKEN_TTL ?? '15m',
    REFRESH_TOKEN_TTL: config.REFRESH_TOKEN_TTL ?? '30d',
    PASSWORD_RESET_TTL: config.PASSWORD_RESET_TTL ?? '30m',
  };
}
