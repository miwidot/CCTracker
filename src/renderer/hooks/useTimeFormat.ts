import { useSettings } from '../contexts/SettingsContext';

export const useTimeFormat = () => {
  const { settings } = useSettings();

  const formatDateTime = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const use24Hour = settings.time_format === '24h';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24Hour,
    };

    return dateObj.toLocaleString('en-US', options);
  };

  const formatTime = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const use24Hour = settings.time_format === '24h';
    
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24Hour,
    };

    return dateObj.toLocaleString('en-US', options);
  };

  const formatDate = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };

    return dateObj.toLocaleDateString('en-US', options);
  };

  return {
    formatDateTime,
    formatTime,
    formatDate,
    is24Hour: settings.time_format === '24h',
  };
};