/**
 * Base error class for Chiliz MCP
 */
export class ChilizMCPError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isRetryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 503, true, context);
  }
}

/**
 * RPC-related errors
 */
export class RPCError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'RPC_ERROR', 502, true, context);
  }
}

/**
 * Contract-related errors
 */
export class ContractError extends ChilizMCPError {
  constructor(message: string, isRetryable: boolean = false, context?: Record<string, any>) {
    super(message, 'CONTRACT_ERROR', 400, isRetryable, context);
  }
}

/**
 * Transaction-related errors
 */
export class TransactionError extends ChilizMCPError {
  constructor(message: string, isRetryable: boolean = false, context?: Record<string, any>) {
    super(message, 'TRANSACTION_ERROR', 400, isRetryable, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, false, context);
  }
}

/**
 * API-related errors (external APIs like CoinGecko, 1inch, etc.)
 */
export class APIError extends ChilizMCPError {
  constructor(message: string, statusCode: number = 502, context?: Record<string, any>) {
    super(message, 'API_ERROR', statusCode, true, context);
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends ChilizMCPError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, context);
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, false, context);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', 500, false, context);
  }
}

/**
 * Insufficient funds errors
 */
export class InsufficientFundsError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'INSUFFICIENT_FUNDS', 400, false, context);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', 408, true, context);
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, false, context);
  }
}

/**
 * Deployment errors
 */
export class DeploymentError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DEPLOYMENT_ERROR', 400, false, context);
  }
}

/**
 * Compilation errors
 */
export class CompilationError extends ChilizMCPError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'COMPILATION_ERROR', 400, false, context);
  }
}

/**
 * WebSocket errors
 */
export class WebSocketError extends ChilizMCPError {
  constructor(message: string, isRetryable: boolean = true, context?: Record<string, any>) {
    super(message, 'WEBSOCKET_ERROR', 503, isRetryable, context);
  }
}
