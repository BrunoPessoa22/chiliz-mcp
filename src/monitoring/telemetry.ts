import { EventEmitter } from 'events';

export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

export interface Event {
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface PerformanceMetrics {
  requestsTotal: number;
  requestsSuccess: number;
  requestsError: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
}

/**
 * Telemetry and metrics collection
 */
export class Telemetry extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private events: Event[] = [];
  private responseTimes: number[] = [];
  private requestCounts = {
    total: 0,
    success: 0,
    error: 0
  };
  private startTime: number = Date.now();
  private maxEventsStored = 1000;
  private maxMetricsPerName = 100;

  constructor() {
    super();
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      labels,
      timestamp: Date.now()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsArray = this.metrics.get(name)!;
    metricsArray.push(metric);

    // Keep only the last N metrics
    if (metricsArray.length > this.maxMetricsPerName) {
      metricsArray.shift();
    }

    this.emit('metric', metric);
  }

  /**
   * Record an event
   */
  recordEvent(type: string, data: Record<string, any>): void {
    const event: Event = {
      type,
      data,
      timestamp: Date.now()
    };

    this.events.push(event);

    // Keep only the last N events
    if (this.events.length > this.maxEventsStored) {
      this.events.shift();
    }

    this.emit('event', event);
  }

  /**
   * Record a request
   */
  recordRequest(success: boolean, responseTime: number): void {
    this.requestCounts.total++;
    if (success) {
      this.requestCounts.success++;
    } else {
      this.requestCounts.error++;
    }

    this.responseTimes.push(responseTime);

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    this.recordMetric('request_duration_ms', responseTime, {
      status: success ? 'success' : 'error'
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const avg = sortedTimes.length > 0
      ? sortedTimes.reduce((sum, t) => sum + t, 0) / sortedTimes.length
      : 0;

    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      requestsTotal: this.requestCounts.total,
      requestsSuccess: this.requestCounts.success,
      requestsError: this.requestCounts.error,
      averageResponseTime: avg,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get all metrics for a name
   */
  getMetrics(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): Event[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string, limit: number = 100): Event[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit);
  }

  /**
   * Get metric summary
   */
  getMetricSummary(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    latest: number;
  } | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      latest: values[values.length - 1]
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Reset all counters
   */
  reset(): void {
    this.clearMetrics();
    this.clearEvents();
    this.responseTimes = [];
    this.requestCounts = {
      total: 0,
      success: 0,
      error: 0
    };
    this.startTime = Date.now();
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: PerformanceMetrics;
    system: SystemMetrics;
    checks: {
      errorRate: boolean;
      responseTime: boolean;
      memory: boolean;
    };
  } {
    const perf = this.getPerformanceMetrics();
    const system = this.getSystemMetrics();

    const errorRate = perf.requestsTotal > 0
      ? perf.requestsError / perf.requestsTotal
      : 0;

    const checks = {
      errorRate: errorRate < 0.05, // Less than 5% error rate
      responseTime: perf.p95ResponseTime < 5000, // p95 under 5 seconds
      memory: system.memoryUsage.heapUsed < system.memoryUsage.heapTotal * 0.9 // Less than 90% memory usage
    };

    let status: 'healthy' | 'degraded' | 'unhealthy';
    const healthyChecks = Object.values(checks).filter(Boolean).length;

    if (healthyChecks === 3) {
      status = 'healthy';
    } else if (healthyChecks >= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      metrics: perf,
      system,
      checks
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    let output = '';

    // Request metrics
    output += '# HELP chiliz_mcp_requests_total Total number of requests\n';
    output += '# TYPE chiliz_mcp_requests_total counter\n';
    output += `chiliz_mcp_requests_total{status="success"} ${this.requestCounts.success}\n`;
    output += `chiliz_mcp_requests_total{status="error"} ${this.requestCounts.error}\n`;

    // Response time
    const perf = this.getPerformanceMetrics();
    output += '# HELP chiliz_mcp_response_time_ms Response time in milliseconds\n';
    output += '# TYPE chiliz_mcp_response_time_ms gauge\n';
    output += `chiliz_mcp_response_time_ms{quantile="0.5"} ${perf.averageResponseTime}\n`;
    output += `chiliz_mcp_response_time_ms{quantile="0.95"} ${perf.p95ResponseTime}\n`;
    output += `chiliz_mcp_response_time_ms{quantile="0.99"} ${perf.p99ResponseTime}\n`;

    // Memory
    const system = this.getSystemMetrics();
    output += '# HELP chiliz_mcp_memory_bytes Memory usage in bytes\n';
    output += '# TYPE chiliz_mcp_memory_bytes gauge\n';
    output += `chiliz_mcp_memory_bytes{type="heap_used"} ${system.memoryUsage.heapUsed}\n`;
    output += `chiliz_mcp_memory_bytes{type="heap_total"} ${system.memoryUsage.heapTotal}\n`;

    // Uptime
    output += '# HELP chiliz_mcp_uptime_seconds Uptime in seconds\n';
    output += '# TYPE chiliz_mcp_uptime_seconds counter\n';
    output += `chiliz_mcp_uptime_seconds ${system.uptime / 1000}\n`;

    return output;
  }
}

// Global telemetry instance
export const telemetry = new Telemetry();
