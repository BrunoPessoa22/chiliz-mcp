import { cacheManager } from '../utils/cache.js';

export interface ValidatorMetrics {
  address: string;
  name?: string;
  commission: number;
  uptime: number;
  totalStaked: string;
  totalStakedFormatted: number;
  delegators: number;
  apy: number;
  slashingHistory: SlashingEvent[];
  reputationScore: number;
  rank: number;
}

export interface SlashingEvent {
  validator: string;
  timestamp: number;
  reason: 'downtime' | 'double_sign' | 'byzantine';
  amountSlashed: string;
  blockHeight: number;
  severity: 'minor' | 'moderate' | 'severe';
}

export interface StakingRewards {
  dailyRewards: number;
  weeklyRewards: number;
  monthlyRewards: number;
  yearlyRewards: number;
  apy: number;
  estimatedTimestamp: number;
}

export interface StakingPosition {
  validator: string;
  stakedAmount: string;
  rewards: string;
  delegationDate: number;
  status: 'active' | 'unbonding' | 'unbonded';
  unbondingCompletionDate?: number;
}

export class StakingAnalyzer {
  constructor() {
    // Initialized
  }

  /**
   * Compare all validators by performance metrics
   */
  async compareValidators(params?: {
    sortBy?: 'apy' | 'uptime' | 'reputation' | 'total_staked';
    limit?: number;
  }): Promise<{
    validators: ValidatorMetrics[];
    averageAPY: number;
    averageUptime: number;
    totalStaked: string;
    recommendedValidator: ValidatorMetrics;
  }> {
    const sortBy = params?.sortBy || 'reputation';
    const limit = params?.limit || 20;

    const cacheKey = `validators_${sortBy}_${limit}`;
    const cached = cacheManager.get('blockchainInfo', cacheKey);

    if (cached) {
      return cached;
    }

    // In production, query validator set from blockchain
    // Mock data for demonstration
    const validators = await this.getValidatorSet();

    // Sort validators
    let sorted = [...validators];
    switch (sortBy) {
      case 'apy':
        sorted.sort((a, b) => b.apy - a.apy);
        break;
      case 'uptime':
        sorted.sort((a, b) => b.uptime - a.uptime);
        break;
      case 'reputation':
        sorted.sort((a, b) => b.reputationScore - a.reputationScore);
        break;
      case 'total_staked':
        sorted.sort((a, b) => b.totalStakedFormatted - a.totalStakedFormatted);
        break;
    }

    sorted = sorted.slice(0, limit);

    // Add ranks
    sorted.forEach((v, i) => {
      v.rank = i + 1;
    });

    const averageAPY = sorted.reduce((sum, v) => sum + v.apy, 0) / sorted.length;
    const averageUptime = sorted.reduce((sum, v) => sum + v.uptime, 0) / sorted.length;
    const totalStaked = sorted.reduce((sum, v) => sum + v.totalStakedFormatted, 0).toString();

    // Recommend validator with best reputation and uptime
    const recommended = sorted.reduce((best, current) => {
      const bestScore = best.reputationScore * best.uptime;
      const currentScore = current.reputationScore * current.uptime;
      return currentScore > bestScore ? current : best;
    });

    const result = {
      validators: sorted,
      averageAPY,
      averageUptime,
      totalStaked,
      recommendedValidator: recommended,
    };

    cacheManager.set('blockchainInfo', cacheKey, result, 60);
    return result;
  }

  /**
   * Calculate optimal staking amount and validator selection
   */
  async calculateOptimalStake(params: {
    amount: string;
    riskTolerance?: 'low' | 'medium' | 'high';
    duration?: number; // days
  }): Promise<{
    amount: string;
    recommendedValidators: Array<{
      validator: ValidatorMetrics;
      allocationPercentage: number;
      allocationAmount: string;
      expectedRewards: StakingRewards;
    }>;
    totalExpectedAPY: number;
    diversificationScore: number;
    riskAssessment: string;
  }> {
    const riskTolerance = params.riskTolerance || 'medium';
    const duration = params.duration || 365;

    const cacheKey = `optimal_stake_${params.amount}_${riskTolerance}`;
    const cached = cacheManager.get('blockchainInfo', cacheKey);

    if (cached) {
      return cached;
    }

    const validators = await this.compareValidators({ limit: 10 });

    // Determine allocation strategy based on risk tolerance
    let allocation: Array<{ validator: ValidatorMetrics; percentage: number }>;

    switch (riskTolerance) {
      case 'low':
        // Diversify across top 5 validators
        allocation = validators.validators.slice(0, 5).map((v, i) => ({
          validator: v,
          percentage: [30, 25, 20, 15, 10][i],
        }));
        break;
      case 'medium':
        // Diversify across top 3 validators
        allocation = validators.validators.slice(0, 3).map((v, i) => ({
          validator: v,
          percentage: [50, 30, 20][i],
        }));
        break;
      case 'high':
        // Concentrate on top validator
        allocation = validators.validators.slice(0, 2).map((v, i) => ({
          validator: v,
          percentage: [70, 30][i],
        }));
        break;
    }

    const amountNum = parseFloat(params.amount);
    const recommendedValidators = allocation.map(({ validator, percentage }) => {
      const allocationAmount = (amountNum * percentage) / 100;
      const expectedRewards = this.calculateRewards(allocationAmount.toString(), validator.apy, duration);

      return {
        validator,
        allocationPercentage: percentage,
        allocationAmount: allocationAmount.toString(),
        expectedRewards,
      };
    });

    const totalExpectedAPY = allocation.reduce(
      (sum, { validator, percentage }) => sum + (validator.apy * percentage) / 100,
      0
    );

    // Diversification score (higher is better, max 100)
    const diversificationScore = Math.min((allocation.length / 5) * 100, 100);

    let riskAssessment: string;
    if (riskTolerance === 'low') {
      riskAssessment = 'Conservative strategy with maximum diversification';
    } else if (riskTolerance === 'medium') {
      riskAssessment = 'Balanced strategy with moderate diversification';
    } else {
      riskAssessment = 'Aggressive strategy focused on highest APY';
    }

    const result = {
      amount: params.amount,
      recommendedValidators,
      totalExpectedAPY,
      diversificationScore,
      riskAssessment,
    };

    cacheManager.set('blockchainInfo', cacheKey, result, 300);
    return result;
  }

  /**
   * Get slashing risks for a validator
   */
  async getSlashingRisks(params: {
    validatorAddress: string;
  }): Promise<{
    validator: string;
    riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    slashingHistory: SlashingEvent[];
    totalSlashed: string;
    lastSlashingDate?: number;
    daysSinceLastSlashing?: number;
    uptimeScore: number;
    recommendation: string;
  }> {
    const cacheKey = `slashing_risk_${params.validatorAddress}`;
    const cached = cacheManager.get('blockchainInfo', cacheKey);

    if (cached) {
      return cached;
    }

    // In production, query slashing events from blockchain
    const slashingHistory = await this.getSlashingHistory(params.validatorAddress);
    const validators = await this.getValidatorSet();
    const validator = validators.find(v => v.address === params.validatorAddress);

    if (!validator) {
      throw new Error(`Validator ${params.validatorAddress} not found`);
    }

    const totalSlashed = slashingHistory.reduce(
      (sum, event) => sum + parseFloat(event.amountSlashed),
      0
    ).toString();

    const lastSlashing = slashingHistory.length > 0 ? slashingHistory[0] : null;
    const lastSlashingDate = lastSlashing?.timestamp;
    const daysSinceLastSlashing = lastSlashing
      ? Math.floor((Date.now() / 1000 - lastSlashing.timestamp) / (24 * 60 * 60))
      : undefined;

    // Calculate risk level
    let riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    if (slashingHistory.length === 0 && validator.uptime > 99.5) {
      riskLevel = 'very_low';
    } else if (slashingHistory.length <= 1 && validator.uptime > 99) {
      riskLevel = 'low';
    } else if (slashingHistory.length <= 3 && validator.uptime > 98) {
      riskLevel = 'medium';
    } else if (slashingHistory.length <= 5 && validator.uptime > 95) {
      riskLevel = 'high';
    } else {
      riskLevel = 'very_high';
    }

    let recommendation: string;
    switch (riskLevel) {
      case 'very_low':
        recommendation = 'Excellent track record - safe to stake';
        break;
      case 'low':
        recommendation = 'Good track record - low risk';
        break;
      case 'medium':
        recommendation = 'Moderate risk - monitor performance';
        break;
      case 'high':
        recommendation = 'High risk - consider alternative validators';
        break;
      case 'very_high':
        recommendation = 'Very high risk - not recommended for staking';
        break;
    }

    const result = {
      validator: params.validatorAddress,
      riskLevel,
      slashingHistory,
      totalSlashed,
      lastSlashingDate,
      daysSinceLastSlashing,
      uptimeScore: validator.uptime,
      recommendation,
    };

    cacheManager.set('blockchainInfo', cacheKey, result, 300);
    return result;
  }

  /**
   * Project staking rewards over time
   */
  async projectRewards(params: {
    amount: string;
    validatorAddress?: string;
    days?: number;
  }): Promise<{
    amount: string;
    validator?: string;
    apy: number;
    projections: {
      daily: StakingRewards;
      weekly: StakingRewards;
      monthly: StakingRewards;
      yearly: StakingRewards;
      custom?: StakingRewards;
    };
    compoundingEffect: {
      withCompounding: string;
      withoutCompounding: string;
      difference: string;
    };
  }> {
    const days = params.days || 365;
    const cacheKey = `rewards_projection_${params.amount}_${params.validatorAddress}_${days}`;
    const cached = cacheManager.get('blockchainInfo', cacheKey);

    if (cached) {
      return cached;
    }

    let apy: number;

    if (params.validatorAddress) {
      const validators = await this.getValidatorSet();
      const validator = validators.find(v => v.address === params.validatorAddress);
      if (!validator) {
        throw new Error(`Validator ${params.validatorAddress} not found`);
      }
      apy = validator.apy;
    } else {
      const { averageAPY } = await this.compareValidators();
      apy = averageAPY;
    }

    const projections = {
      daily: this.calculateRewards(params.amount, apy, 1),
      weekly: this.calculateRewards(params.amount, apy, 7),
      monthly: this.calculateRewards(params.amount, apy, 30),
      yearly: this.calculateRewards(params.amount, apy, 365),
      custom: days !== 365 ? this.calculateRewards(params.amount, apy, days) : undefined,
    };

    // Calculate compounding effect
    const principal = parseFloat(params.amount);
    const dailyRate = apy / 100 / 365;

    const withCompounding = principal * Math.pow(1 + dailyRate, days);
    const withoutCompounding = principal + (principal * (apy / 100) * (days / 365));

    const result = {
      amount: params.amount,
      validator: params.validatorAddress,
      apy,
      projections,
      compoundingEffect: {
        withCompounding: withCompounding.toFixed(2),
        withoutCompounding: withoutCompounding.toFixed(2),
        difference: (withCompounding - withoutCompounding).toFixed(2),
      },
    };

    cacheManager.set('blockchainInfo', cacheKey, result, 300);
    return result;
  }

  /**
   * Monitor slashing events across all validators
   */
  async monitorSlashingEvents(params?: {
    hours?: number;
    severity?: 'minor' | 'moderate' | 'severe';
  }): Promise<{
    events: SlashingEvent[];
    totalEvents: number;
    totalSlashed: string;
    affectedValidators: number;
    byReason: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const hours = params?.hours || 24;
    const cacheKey = `slashing_events_${hours}_${params?.severity || 'all'}`;
    const cached = cacheManager.get('blockchainInfo', cacheKey);

    if (cached) {
      return cached;
    }

    // In production, query slashing events from blockchain
    const startTime = Math.floor(Date.now() / 1000) - (hours * 60 * 60);
    const allEvents = await this.getAllSlashingEvents(startTime);

    const events = params?.severity
      ? allEvents.filter(e => e.severity === params.severity)
      : allEvents;

    const totalSlashed = events.reduce((sum, e) => sum + parseFloat(e.amountSlashed), 0).toString();
    const affectedValidators = new Set(events.map(e => e.validator)).size;

    const byReason = events.reduce((acc, e) => {
      acc[e.reason] = (acc[e.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = events.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = {
      events,
      totalEvents: events.length,
      totalSlashed,
      affectedValidators,
      byReason,
      bySeverity,
    };

    cacheManager.set('blockchainInfo', cacheKey, result, 60);
    return result;
  }

  /**
   * Get validator performance metrics
   */
  async getValidatorPerformance(params: {
    validatorAddress: string;
    days?: number;
  }): Promise<{
    validator: ValidatorMetrics;
    performance: {
      blocksProposed: number;
      blocksMissed: number;
      successRate: number;
      averageBlockTime: number;
    };
    rewards: {
      totalEarned: string;
      delegatorRewards: string;
      commissionEarned: string;
    };
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const days = params.days || 30;
    const cacheKey = `validator_performance_${params.validatorAddress}_${days}`;
    const cached = cacheManager.get('blockchainInfo', cacheKey);

    if (cached) {
      return cached;
    }

    const validators = await this.getValidatorSet();
    const validator = validators.find(v => v.address === params.validatorAddress);

    if (!validator) {
      throw new Error(`Validator ${params.validatorAddress} not found`);
    }

    // Mock performance data
    const blocksProposed = Math.floor(Math.random() * 1000) + 500;
    const blocksMissed = Math.floor(Math.random() * 50);
    const successRate = (blocksProposed / (blocksProposed + blocksMissed)) * 100;
    const averageBlockTime = 3.2 + (Math.random() - 0.5);

    const totalEarned = (parseFloat(validator.totalStaked) * (validator.apy / 100) * (days / 365)).toFixed(2);
    const commissionEarned = (parseFloat(totalEarned) * validator.commission).toFixed(2);
    const delegatorRewards = (parseFloat(totalEarned) - parseFloat(commissionEarned)).toFixed(2);

    // Determine trend based on uptime
    let trend: 'improving' | 'stable' | 'declining';
    if (validator.uptime > 99.5) {
      trend = 'stable';
    } else if (validator.uptime > 98) {
      trend = validator.uptime > 99 ? 'improving' : 'declining';
    } else {
      trend = 'declining';
    }

    const result = {
      validator,
      performance: {
        blocksProposed,
        blocksMissed,
        successRate,
        averageBlockTime,
      },
      rewards: {
        totalEarned,
        delegatorRewards,
        commissionEarned,
      },
      trend,
    };

    cacheManager.set('blockchainInfo', cacheKey, result, 300);
    return result;
  }

  // Helper methods

  private async getValidatorSet(): Promise<ValidatorMetrics[]> {
    // In production, query from blockchain
    // Mock data for demonstration
    return [
      {
        address: '0xvalidator1',
        name: 'Chiliz Validator 1',
        commission: 0.05,
        uptime: 99.8,
        totalStaked: '5000000',
        totalStakedFormatted: 5000000,
        delegators: 1250,
        apy: 12.5,
        slashingHistory: [],
        reputationScore: 98,
        rank: 1,
      },
      {
        address: '0xvalidator2',
        name: 'Chiliz Validator 2',
        commission: 0.08,
        uptime: 99.5,
        totalStaked: '4500000',
        totalStakedFormatted: 4500000,
        delegators: 980,
        apy: 11.8,
        slashingHistory: [],
        reputationScore: 95,
        rank: 2,
      },
      {
        address: '0xvalidator3',
        name: 'Chiliz Validator 3',
        commission: 0.10,
        uptime: 98.9,
        totalStaked: '3800000',
        totalStakedFormatted: 3800000,
        delegators: 750,
        apy: 10.5,
        slashingHistory: [
          {
            validator: '0xvalidator3',
            timestamp: Date.now() / 1000 - 86400 * 30,
            reason: 'downtime',
            amountSlashed: '1000',
            blockHeight: 1000000,
            severity: 'minor',
          },
        ],
        reputationScore: 88,
        rank: 3,
      },
    ];
  }

  private calculateRewards(amount: string, apy: number, days: number): StakingRewards {
    const principal = parseFloat(amount);
    const dailyRate = apy / 100 / 365;

    const dailyRewards = principal * dailyRate;
    const weeklyRewards = dailyRewards * 7;
    const monthlyRewards = dailyRewards * 30;
    const yearlyRewards = principal * (apy / 100);

    return {
      dailyRewards: parseFloat(dailyRewards.toFixed(6)),
      weeklyRewards: parseFloat(weeklyRewards.toFixed(6)),
      monthlyRewards: parseFloat(monthlyRewards.toFixed(6)),
      yearlyRewards: parseFloat(yearlyRewards.toFixed(6)),
      apy,
      estimatedTimestamp: Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60),
    };
  }

  private async getSlashingHistory(validatorAddress: string): Promise<SlashingEvent[]> {
    // In production, query from blockchain
    const validators = await this.getValidatorSet();
    const validator = validators.find(v => v.address === validatorAddress);
    return validator?.slashingHistory || [];
  }

  private async getAllSlashingEvents(_startTime: number): Promise<SlashingEvent[]> {
    // In production, query all slashing events from blockchain
    return [];
  }
}

// Singleton instance
export const stakingAnalyzer = new StakingAnalyzer();
