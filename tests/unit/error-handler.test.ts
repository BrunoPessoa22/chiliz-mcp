import { describe, it, expect, beforeEach } from '@jest/globals';
import { ErrorHandler } from '../../src/errors/error-handler.js';
import { NetworkError, RateLimitError, ChilizMCPError } from '../../src/errors/chiliz-error.js';

describe('ErrorHandler', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = async () => 'success';
      const result = await ErrorHandler.withRetry(
        operation,
        { operation: 'test', timestamp: Date.now() }
      );
      expect(result).toBe('success');
    });

    it('should retry on retryable error', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError('Network error');
        }
        return 'success';
      };

      const result = await ErrorHandler.withRetry(
        operation,
        { operation: 'test', timestamp: Date.now() },
        { maxRetries: 3, baseDelayMs: 10 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry on non-retryable error', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new ChilizMCPError('Non-retryable', 'TEST_ERROR', 400, false);
      };

      await expect(
        ErrorHandler.withRetry(
          operation,
          { operation: 'test', timestamp: Date.now() },
          { maxRetries: 3 }
        )
      ).rejects.toThrow();

      expect(attempts).toBe(1);
    });

    it('should respect max retries', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new NetworkError('Network error');
      };

      await expect(
        ErrorHandler.withRetry(
          operation,
          { operation: 'test', timestamp: Date.now() },
          { maxRetries: 2, baseDelayMs: 10 }
        )
      ).rejects.toThrow();

      expect(attempts).toBe(3); // 1 initial + 2 retries
    });

    it('should handle rate limit errors with retry-after', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts === 1) {
          throw new RateLimitError('Rate limited', 1); // 1 second retry-after
        }
        return 'success';
      };

      const start = Date.now();
      const result = await ErrorHandler.withRetry(
        operation,
        { operation: 'test', timestamp: Date.now() },
        { maxRetries: 2, baseDelayMs: 10 }
      );
      const duration = Date.now() - start;

      expect(result).toBe('success');
      expect(attempts).toBe(2);
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('withParallel', () => {
    it('should execute all operations in parallel', async () => {
      const operations = [
        async () => 'result1',
        async () => 'result2',
        async () => 'result3',
      ];

      const results = await ErrorHandler.withParallel(
        operations,
        { operation: 'test', timestamp: Date.now() }
      );

      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should continue on error by default', async () => {
      const operations = [
        async () => 'result1',
        async () => { throw new Error('Error'); },
        async () => 'result3',
      ];

      const results = await ErrorHandler.withParallel(
        operations,
        { operation: 'test', timestamp: Date.now() }
      );

      expect(results).toEqual(['result1', 'result3']);
    });

    it('should fail fast when configured', async () => {
      const operations = [
        async () => 'result1',
        async () => { throw new Error('Error'); },
        async () => 'result3',
      ];

      await expect(
        ErrorHandler.withParallel(
          operations,
          { operation: 'test', timestamp: Date.now() },
          { failFast: true }
        )
      ).rejects.toThrow();
    });
  });

  describe('wrapError', () => {
    it('should wrap ChilizMCPError as-is', () => {
      const error = new NetworkError('Network error');
      const wrapped = ErrorHandler.wrapError(error, {
        operation: 'test',
        timestamp: Date.now()
      });

      expect(wrapped).toBe(error);
    });

    it('should wrap standard Error', () => {
      const error = new Error('Standard error');
      const wrapped = ErrorHandler.wrapError(error, {
        operation: 'test',
        timestamp: Date.now()
      });

      expect(wrapped).toBeInstanceOf(ChilizMCPError);
      expect(wrapped.message).toBe('Standard error');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });

    it('should wrap unknown error', () => {
      const error = 'String error';
      const wrapped = ErrorHandler.wrapError(error, {
        operation: 'test',
        timestamp: Date.now()
      });

      expect(wrapped).toBeInstanceOf(ChilizMCPError);
      expect(wrapped.message).toBe('String error');
    });
  });

  describe('createCircuitBreaker', () => {
    it('should open circuit after max failures', async () => {
      const breaker = ErrorHandler.createCircuitBreaker(3, 60000);
      const operation = async () => {
        throw new Error('Operation failed');
      };

      // First 3 failures
      for (let i = 0; i < 3; i++) {
        await expect(
          breaker(operation, { operation: 'test', timestamp: Date.now() })
        ).rejects.toThrow();
      }

      // Circuit should be open now
      await expect(
        breaker(operation, { operation: 'test', timestamp: Date.now() })
      ).rejects.toThrow('Circuit breaker is open');
    });

    it('should reset after successful call', async () => {
      const breaker = ErrorHandler.createCircuitBreaker(3, 60000);
      let shouldFail = true;

      const operation = async () => {
        if (shouldFail) {
          throw new Error('Operation failed');
        }
        return 'success';
      };

      // Fail once
      await expect(
        breaker(operation, { operation: 'test', timestamp: Date.now() })
      ).rejects.toThrow('Operation failed');

      // Succeed
      shouldFail = false;
      const result = await breaker(operation, { operation: 'test', timestamp: Date.now() });
      expect(result).toBe('success');

      // Should be able to fail again without hitting circuit breaker
      shouldFail = true;
      await expect(
        breaker(operation, { operation: 'test', timestamp: Date.now() })
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('serializeError', () => {
    it('should serialize ChilizMCPError', () => {
      const error = new NetworkError('Network error', { detail: 'test' });
      const serialized = ErrorHandler.serializeError(error);

      expect(serialized).toHaveProperty('name');
      expect(serialized).toHaveProperty('message');
      expect(serialized).toHaveProperty('code');
      expect(serialized).toHaveProperty('statusCode');
      expect(serialized.context).toEqual({ detail: 'test' });
    });

    it('should serialize standard Error', () => {
      const error = new Error('Standard error');
      const serialized = ErrorHandler.serializeError(error);

      expect(serialized).toHaveProperty('name');
      expect(serialized).toHaveProperty('message');
      expect(serialized).toHaveProperty('stack');
    });

    it('should serialize unknown error', () => {
      const error = 'String error';
      const serialized = ErrorHandler.serializeError(error);

      expect(serialized).toEqual({ error: 'String error' });
    });
  });
});
