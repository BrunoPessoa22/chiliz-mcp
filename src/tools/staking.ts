import { stakingAnalyzer } from '../staking/staking-analytics.js';

/**
 * Compare validators by performance metrics
 */
export async function compareValidators(params?: {
  sortBy?: 'apy' | 'uptime' | 'reputation' | 'total_staked';
  limit?: number;
}) {
  return await stakingAnalyzer.compareValidators(params);
}

/**
 * Calculate optimal staking strategy
 */
export async function calculateStakingRewards(params: {
  amount: string;
  validatorAddress?: string;
  days?: number;
}) {
  return await stakingAnalyzer.projectRewards(params);
}

/**
 * Get detailed validator performance
 */
export async function getValidatorPerformance(params: {
  validatorAddress: string;
  days?: number;
}) {
  return await stakingAnalyzer.getValidatorPerformance(params);
}

/**
 * Monitor slashing events
 */
export async function monitorSlashingEvents(params?: {
  hours?: number;
  severity?: 'minor' | 'moderate' | 'severe';
}) {
  return await stakingAnalyzer.monitorSlashingEvents(params);
}

/**
 * Get slashing risks for a validator
 */
export async function getValidatorRisks(params: {
  validatorAddress: string;
}) {
  return await stakingAnalyzer.getSlashingRisks(params);
}

/**
 * Calculate optimal stake allocation
 */
export async function calculateOptimalStake(params: {
  amount: string;
  riskTolerance?: 'low' | 'medium' | 'high';
  duration?: number;
}) {
  return await stakingAnalyzer.calculateOptimalStake(params);
}
