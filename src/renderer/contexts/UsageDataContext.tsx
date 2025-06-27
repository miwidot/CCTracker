import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UsageEntry, SessionStats, DateRangeStats } from '@shared/types';

interface UsageDataContextType {
  usageData: UsageEntry[];
  sessionStats: SessionStats[];
  isLoading: boolean;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  getUsageByDateRange: (start: string, end: string) => Promise<DateRangeStats>;
  getSessionStats: (sessionId: string) => Promise<SessionStats>;
}

const UsageDataContext = createContext<UsageDataContextType | undefined>(undefined);

export const useUsageData = () => {
  const context = useContext(UsageDataContext);
  if (!context) {
    throw new Error('useUsageData must be used within a UsageDataProvider');
  }
  return context;
};

interface UsageDataProviderProps {
  children: React.ReactNode;
}

export const UsageDataProvider: React.FC<UsageDataProviderProps> = ({ children }) => {
  const [usageData, setUsageData] = useState<UsageEntry[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usage, sessions] = await Promise.all([
        window.electronAPI.getUsageStats(),
        // For now, we'll derive session stats from usage data
        window.electronAPI.getUsageStats().then(data => {
          // Group by session_id to create session stats
          const sessionMap = new Map<string, SessionStats>();
          data.forEach((entry: UsageEntry) => {
            if (entry.session_id) {
              const existing = sessionMap.get(entry.session_id);
              if (existing) {
                existing.total_cost += entry.cost_usd;
                existing.total_tokens += entry.total_tokens;
                existing.message_count += 1;
                existing.end_time = entry.timestamp;
              } else {
                sessionMap.set(entry.session_id, {
                  session_id: entry.session_id,
                  start_time: entry.timestamp,
                  end_time: entry.timestamp,
                  total_cost: entry.cost_usd,
                  total_tokens: entry.total_tokens,
                  message_count: 1,
                  model: entry.model,
                });
              }
            }
          });
          return Array.from(sessionMap.values());
        }),
      ]);

      setUsageData(usage);
      setSessionStats(sessions);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh usage data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUsageByDateRange = useCallback(async (start: string, end: string) => {
    return await window.electronAPI.getUsageByDateRange(start, end);
  }, []);

  const getSessionStats = useCallback(async (sessionId: string) => {
    return await window.electronAPI.getSessionStats(sessionId);
  }, []);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set up real-time updates
  useEffect(() => {
    const unsubscribe = window.electronAPI.onUsageUpdate((data) => {
      setUsageData(prev => [...prev, data]);
      setLastUpdated(new Date());
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <UsageDataContext.Provider
      value={{
        usageData,
        sessionStats,
        isLoading,
        lastUpdated,
        refreshData,
        getUsageByDateRange,
        getSessionStats,
      }}
    >
      {children}
    </UsageDataContext.Provider>
  );
};