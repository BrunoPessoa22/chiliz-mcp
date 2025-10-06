import { z } from 'zod';

/**
 * Configuration schema using Zod for validation
 */

export const NetworkConfigSchema = z.object({
  chainId: z.number().int().positive(),
  name: z.string().min(1),
  rpcUrl: z.string().url(),
  wssUrl: z.string().url().optional(),
  explorerUrl: z.string().url(),
  currency: z.object({
    name: z.string(),
    symbol: z.string(),
    decimals: z.number().int().positive()
  })
});

export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().int().positive().default(300), // 5 minutes
  maxKeys: z.number().int().positive().default(1000)
});

export const RateLimitConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxRequests: z.number().int().positive().default(100),
  windowMs: z.number().int().positive().default(60000) // 1 minute
});

export const SecurityConfigSchema = z.object({
  keyManagerPassword: z.string().optional(),
  requireTransactionConfirmation: z.boolean().default(true),
  maxTransactionValue: z.string().optional() // in ETH/CHZ
});

export const APIKeysSchema = z.object({
  coingecko: z.string().optional(),
  oneInch: z.string().optional(),
  custom: z.record(z.string()).optional()
});

export const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(false),
  metricsPort: z.number().int().positive().default(9090),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  enableTelemetry: z.boolean().default(true)
});

export const ConfigSchema = z.object({
  network: NetworkConfigSchema,
  cache: CacheConfigSchema,
  rateLimit: RateLimitConfigSchema,
  security: SecurityConfigSchema,
  apiKeys: APIKeysSchema,
  monitoring: MonitoringConfigSchema,
  privateKey: z.string().optional(),
  environment: z.enum(['development', 'production', 'test']).default('development')
});

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type APIKeys = z.infer<typeof APIKeysSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Validate configuration object
 */
export function validateConfig(config: unknown): Config {
  return ConfigSchema.parse(config);
}

/**
 * Validate configuration with defaults
 */
export function validateConfigWithDefaults(config: unknown): Config {
  const defaultConfig: Partial<Config> = {
    cache: {
      enabled: true,
      ttl: 300,
      maxKeys: 1000
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000
    },
    security: {
      requireTransactionConfirmation: true
    },
    monitoring: {
      enabled: false,
      metricsPort: 9090,
      logLevel: 'info',
      enableTelemetry: true
    },
    environment: 'development'
  };

  const merged = { ...defaultConfig, ...(config as object) };
  return ConfigSchema.parse(merged);
}

/**
 * Environment variable schema
 */
export const EnvSchema = z.object({
  // Network
  CHILIZ_RPC_URL: z.string().url(),
  CHILIZ_WSS_URL: z.string().url().optional(),
  NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),

  // Security
  PRIVATE_KEY: z.string().optional(),
  KEY_MANAGER_PASSWORD: z.string().optional(),

  // API Keys
  COINGECKO_API_KEY: z.string().optional(),
  ONEINCH_API_KEY: z.string().optional(),

  // Cache
  CACHE_ENABLED: z.string().transform(val => val === 'true').default('true'),
  CACHE_TTL: z.string().transform(val => parseInt(val)).default('300'),

  // Rate Limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  RATE_LIMIT_REQUESTS: z.string().transform(val => parseInt(val)).default('100'),

  // Monitoring
  MONITORING_ENABLED: z.string().transform(val => val === 'true').default('false'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  METRICS_PORT: z.string().transform(val => parseInt(val)).default('9090'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Load and validate environment variables
 */
export function loadEnvConfig(): EnvConfig {
  return EnvSchema.parse(process.env);
}
