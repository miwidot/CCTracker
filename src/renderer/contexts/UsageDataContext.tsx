import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UsageEntry, SessionStats, DateRangeStats } from '@shared/types';
import { log } from '@shared/utils/logger';

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
      const usage = await window.electronAPI.getUsageStats();
      
      // Group by session_id and calculate stats using centralized logic
      const sessionMap = new Map<string, UsageEntry[]>();
      usage.forEach((entry: UsageEntry) => {
        if (entry.session_id != null && entry.session_id !== '') {
          if (!sessionMap.has(entry.session_id)) {
            sessionMap.set(entry.session_id, []);
          }
          const sessionEntries = sessionMap.get(entry.session_id);
          if (sessionEntries != null) {
            sessionEntries.push(entry);
          }
        }
      });

      // Calculate session stats using centralized calculation
      const sessions = Array.from(sessionMap.entries()).map(([sessionId, entries]) => {
        // Use centralized calculation logic (we'll need to call the service)
        return {
          session_id: sessionId,
          start_time: entries[0].timestamp,
          end_time: entries[entries.length - 1].timestamp,
          total_cost: entries.reduce((sum, entry) => sum + entry.cost_usd, 0),
          total_tokens: entries.reduce((sum, entry) => sum + entry.total_tokens, 0),
          message_count: entries.length,
          model: entries[0].model, // Most common model could be calculated better
        };
      });

      setUsageData(usage);
      setSessionStats(sessions);
      setLastUpdated(new Date());
    } catch (error) {
      log.error('Failed to refresh usage data', error as Error, 'UsageDataContext');
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
    void refreshData();
  }, [refreshData]);

  // Set up real-time updates
  useEffect(() => {
    const unsubscribe = window.electronAPI.onUsageUpdate((data) => {
      setUsageData(prev => [...prev, ...data]);
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
    const interval = setInterval(() => void refreshData(), 30000);
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