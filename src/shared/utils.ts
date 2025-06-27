/**
 * Shared utility functions used across the application
 */

/**
 * Format large numbers of tokens in readable format (K, M)
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Clean up model names for display (remove version suffixes)
 */
export function cleanModelName(model: string): string {
  // Remove version suffixes like -20241022, -v1, etc.
  return model.replace(/-\d{8}$/, '').replace(/-v\d+$/, '');
}

/**
 * Extract project name from file path
 */
export function extractProjectName(filePath: string): string {
  if (!filePath) return 'Unknown';
  
  // Extract the last directory name from the path
  const parts = filePath.split(/[/\\]/);
  const projectDir = parts[parts.length - 1] || parts[parts.length - 2];
  
  // Clean up and format the project name
  return projectDir
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim() || 'Unknown';
}

/**
 * Format percentage values consistently
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers in compact form (K, M, B)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Generate a chart color by index using CSS variables
 * This function should be used sparingly - prefer CSS variables directly
 */
export function generateColor(index: number): string {
  return `var(--chart-color-${(index % 10) + 1})`;
}