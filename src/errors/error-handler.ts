import { ChilizMCPError, RateLimitError, NetworkError } from './chiliz-error.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ErrorContext {
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Centralized error handling with retry logic
 */
export class ErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'RPC_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'API_ERROR'
    ]
  };

  /**
   * Execute an operation with automatic retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retryConfig.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error, retryConfig);

        if (!isRetryable || attempt > retryConfig.maxRetries) {
          // Not retryable or max retries exceeded
          throw this.wrapError(error, context);
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, retryConfig, error);

        console.warn(
          `Operation "${context.operation}" failed (attempt ${attempt}/${retryConfig.maxRetries}). ` +
          `Retrying in ${delay}ms...`,
          { error: this.serializeError(error), context }
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw this.wrapError(lastError!, context);
  }

  /**
   * Execute multiple operations in parallel with error handling
   */
  static async withParallel<T>(
    operations: (() => Promise<T>)[],
    context: ErrorContext,
    config: { failFast?: boolean } = {}
  ): Promise<T[]> {
    const results = await Promise.allSettled(operations.map(op => op()));

    const errors: Error[] = [];
    const values: T[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        values.push(result.value);
      } else {
        const wrappedError = this.wrapError(result.reason, context);
        errors.push(wrappedError);

        if (config.failFast) {
          throw wrappedError;
        }
      }
    }

    if (errors.length > 0 && !config.failFast) {
      console.error(
        `Operation "${context.operation}" completed with ${errors.length} errors`,
        { errors: errors.map(e => this.serializeError(e)), context }
      );
    }

    return values;
  }

  /**
   * Handle errors with circuit breaker pattern
   */
  static createCircuitBreaker(
    maxFailures: number = 5,
    resetTimeoutMs: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;

    return async <T>(operation: () => Promise<T>, context: ErrorContext): Promise<T> => {
      // Check if circuit is open
      if (isOpen) {
        const timeSinceLastFailure = Date.now() - lastFailureTime;
        if (timeSinceLastFailure < resetTimeoutMs) {
          throw new ChilizMCPError(
            `Circuit breaker is open for "${context.operation}". Try again later.`,
            'CIRCUIT_BREAKER_OPEN',
            503,
            true,
            { resetIn: resetTimeoutMs - timeSinceLastFailure }
          );
        } else {
          // Reset circuit breaker
          isOpen = false;
          failures = 0;
        }
      }

      try {
        const result = await operation();
        // Success - reset failure count
        failures = 0;
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= maxFailures) {
          isOpen = true;
          console.error(
            `Circuit breaker opened for "${context.operation}" after ${failures} failures`,
            { context }
          );
        }

        throw this.wrapError(error, context);
      }
    };
  }

  /**
   * Wrap an unknown error in a ChilizMCPError
   */
  static wrapError(error: unknown, context: ErrorContext): ChilizMCPError {
    if (error instanceof ChilizMCPError) {
      return error;
    }

    if (error instanceof Error) {
      return new ChilizMCPError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        false,
        {
          operation: context.operation,
          timestamp: context.timestamp,
          originalError: error.name,
          ...context.metadata
        }
      );
    }

    return new ChilizMCPError(
      String(error),
      'UNKNOWN_ERROR',
      500,
      false,
      {
        operation: context.operation,
        timestamp: context.timestamp,
        ...context.metadata
      }
    );
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: unknown, config: RetryConfig): boolean {
    if (error instanceof ChilizMCPError) {
      return error.isRetryable && config.retryableErrors.includes(error.code);
    }

    // Network errors from axios, fetch, etc.
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('etimedout')
      );
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private static calculateDelay(
    attempt: number,
    config: RetryConfig,
    error: unknown
  ): number {
    // For rate limit errors, use the retry-after header if available
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // Exponential backoff with jitter
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

    return Math.floor(delay);
  }

  /**
   * Sleep for a specified duration
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Serialize error for logging
   */
  static serializeError(error: unknown): Record<string, any> {
    if (error instanceof ChilizMCPError) {
      return error.toJSON();
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return {
      error: String(error)
    };
  }

  /**
   * Log error with context
   */
  static logError(error: unknown, context: ErrorContext): void {
    const serialized = this.serializeError(error);
    console.error(`Error in operation "${context.operation}"`, {
      error: serialized,
      context
    });
  }

  /**
   * Create error from RPC response
   */
  static fromRPCError(rpcError: any): ChilizMCPError {
    const message = rpcError.message || 'RPC request failed';
    const code = rpcError.code || -32000;

    // Map common RPC error codes
    if (code === -32000) {
      return new NetworkError(message, { rpcCode: code });
    }

    if (code === -32601) {
      return new ChilizMCPError(
        'Method not found',
        'RPC_METHOD_NOT_FOUND',
        400,
        false,
        { rpcCode: code }
      );
    }

    if (code === -32602) {
      return new ChilizMCPError(
        'Invalid params',
        'RPC_INVALID_PARAMS',
        400,
        false,
        { rpcCode: code }
      );
    }

    return new ChilizMCPError(
      message,
      'RPC_ERROR',
      502,
      true,
      { rpcCode: code }
    );
  }
}
