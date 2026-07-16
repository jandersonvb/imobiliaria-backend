const requiredInProduction = [
  'DATABASE_URL',
  'JWT_SECRET',
  'FRONTEND_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

export function validateEnvironment(config: Record<string, unknown>) {
  if (config.NODE_ENV !== 'production') return config;

  const missing = requiredInProduction.filter((key) => !String(config[key] ?? '').trim());
  if (missing.length) throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);

  if (String(config.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET deve possuir ao menos 32 caracteres em produção.');
  }

  const origins = String(config.FRONTEND_URL).split(',').map((value) => value.trim());
  if (origins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('FRONTEND_URL deve conter apenas origens HTTPS em produção.');
  }

  return config;
}
