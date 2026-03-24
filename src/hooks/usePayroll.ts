import { useState, useEffect } from "react";
import { 
  get_streams_by_employer, 
  get_vault_balance, 
  get_total_liability,
  StreamData,
  VaultBalance 
} from "../contracts/payroll_stream";

export interface Stream {
  id: string;
  employeeName: string;
  employeeAddress: string;
  flowRate: string; // amount per second/block
  tokenSymbol: string;
  startDate: string;
  totalStreamed: string;
}

export const usePayroll = (employerAddress?: string, page: number = 1, limit: number = 50) => {
  const [treasuryBalances, setTreasuryBalances] = useState<VaultBalance[]>([]);
  const [totalLiabilities, setTotalLiabilities] = useState<string>("0");
  const [activeStreams, setActiveStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  useEffect(() => {
    if (!employerAddress) {
      setTreasuryBalances([]);
      setTotalLiabilities("0");
      setActiveStreams([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get vault contract ID from environment
        const vaultContractId = (import.meta.env as any).VITE_PAYROLL_VAULT_CONTRACT_ID as string | undefined;

        // Fetch all data in parallel
        const [streamsData, vaultBalances, liabilities] = await Promise.all([
          get_streams_by_employer(employerAddress, page, limit),
          vaultContractId ? get_vault_balance(vaultContractId) : [],
          vaultContractId ? get_total_liability(vaultContractId) : "0"
        ]);

        // Transform stream data to match the interface
        const transformedStreams: Stream[] = streamsData.map((stream: StreamData) => ({
          id: stream.id.toString(),
          employeeName: `Employee ${stream.worker.slice(0, 8)}...`, // Placeholder - would need registry lookup
          employeeAddress: stream.worker,
          flowRate: (Number(stream.rate) / 1000000).toString(), // Convert from stroops
          tokenSymbol: stream.token === "native" ? "XLM" : stream.token.slice(0, 4), // Simplified
          startDate: new Date(stream.start_ts * 1000).toISOString().split('T')[0],
          totalStreamed: stream.total_withdrawn.toString(),
        }));

        setTreasuryBalances(vaultBalances);
        setTotalLiabilities(liabilities);
        setActiveStreams(transformedStreams);
        
        // If we got exactly 'limit' results, there might be more
        setHasMore(streamsData.length === limit);
      } catch (err) {
        console.error("Failed to fetch payroll data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch payroll data");
        
        // Fallback to empty state
        setTreasuryBalances([]);
        setTotalLiabilities("0");
        setActiveStreams([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [employerAddress, page, limit]);

  return {
    treasuryBalances,
    totalLiabilities,
    activeStreamsCount: activeStreams.length,
    activeStreams,
    isLoading,
    error,
    hasMore,
    currentPage: page,
  };
};
