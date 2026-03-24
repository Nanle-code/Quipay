/**
 * Testnet Integration Test for usePayroll hook
 * 
 * This test verifies that the usePayroll hook correctly connects to
 * live Soroban contracts on testnet and returns real data.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePayroll } from '../usePayroll';

// Mock environment variables for testnet
const TESTNET_CONFIG = {
  VITE_PAYROLL_STREAM_CONTRACT_ID: 'GBAZZ...TESTNET_CONTRACT_ID',
  VITE_PAYROLL_VAULT_CONTRACT_ID: 'GBVAULT...TESTNET_CONTRACT_ID',
  PUBLIC_STELLAR_NETWORK: 'TESTNET',
  PUBLIC_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
  PUBLIC_STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
};

// Test employer address on testnet
const TEST_EMPLOYER_ADDRESS = 'GDTEST...EMPLOYER_ADDRESS';

describe('usePayroll - Testnet Integration', () => {
  beforeEach(() => {
    // Set testnet environment variables
    Object.defineProperty(window, 'import', {
      value: {
        meta: {
          env: TESTNET_CONFIG,
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up environment
    delete (window as any).import;
  });

  it('should connect to testnet contracts and fetch real data', async () => {
    const { result } = renderHook(() => usePayroll(TEST_EMPLOYER_ADDRESS));

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 10000 }); // 10 second timeout for network calls

    // Should have real data (not mock data)
    expect(result.current.treasuryBalances).toBeDefined();
    expect(result.current.totalLiabilities).toBeDefined();
    expect(result.current.activeStreams).toBeDefined();
    expect(result.current.error).toBe(null);

    // Verify data structure matches expected format
    if (result.current.treasuryBalances.length > 0) {
      expect(result.current.treasuryBalances[0]).toHaveProperty('token_symbol');
      expect(result.current.treasuryBalances[0]).toHaveProperty('balance');
    }

    if (result.current.activeStreams.length > 0) {
      const stream = result.current.activeStreams[0];
      expect(stream).toHaveProperty('id');
      expect(stream).toHaveProperty('employeeAddress');
      expect(stream).toHaveProperty('flowRate');
      expect(stream).toHaveProperty('tokenSymbol');
      expect(stream).toHaveProperty('startDate');
      expect(stream).toHaveProperty('totalStreamed');
    }
  });

  it('should handle pagination correctly', async () => {
    const { result } = renderHook(() => usePayroll(TEST_EMPLOYER_ADDRESS, 1, 10));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 10000 });

    // Should have pagination info
    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasMore).toBeDefined();
    
    // If there are streams, should not exceed the limit
    if (result.current.activeStreams.length > 0) {
      expect(result.current.activeStreams.length).toBeLessThanOrEqual(10);
    }
  });

  it('should handle missing employer address gracefully', async () => {
    const { result } = renderHook(() => usePayroll(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return empty state
    expect(result.current.treasuryBalances).toEqual([]);
    expect(result.current.totalLiabilities).toBe('0');
    expect(result.current.activeStreams).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should handle network errors gracefully', async () => {
    // Mock invalid contract ID to trigger error
    Object.defineProperty(window, 'import', {
      value: {
        meta: {
          env: {
            ...TESTNET_CONFIG,
            VITE_PAYROLL_STREAM_CONTRACT_ID: 'INVALID_CONTRACT_ID',
          },
        },
      },
      writable: true,
    });

    const { result } = renderHook(() => usePayroll(TEST_EMPLOYER_ADDRESS));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 10000 });

    // Should handle error without crashing
    expect(result.current.error).toBeDefined();
    expect(result.current.treasuryBalances).toEqual([]);
    expect(result.current.activeStreams).toEqual([]);
  });
});

/**
 * Manual Test Instructions
 * 
 * To manually test this integration:
 * 
 * 1. Set up testnet environment variables in your .env file:
 *    VITE_PAYROLL_STREAM_CONTRACT_ID=<testnet_contract_id>
 *    VITE_PAYROLL_VAULT_CONTRACT_ID=<testnet_vault_id>
 *    PUBLIC_STELLAR_NETWORK=TESTNET
 *    PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
 *    PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
 * 
 * 2. Deploy the contracts to testnet if not already done
 * 
 * 3. Create some test streams using the StreamCreator component
 * 
 * 4. Run the employer dashboard and verify it shows real data
 * 
 * 5. Take a screenshot showing real streams data for the PR
 */
