/**
 * Shared date validation utility functions
 * Used across the application for consistent date handling
 */

/**
 * Validates and converts various date inputs to a Date object
 * @param date - Date input (Date, string, or number)
 * @returns Valid Date object or null if invalid
 */
export function validateAndConvertDate(date: Date | string | number): Date | null {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  
  return dateObj;
}

/**
 * Checks if a date input is valid
 * @param date - Date input (Date, string, or number)
 * @returns True if the date is valid, false otherwise
 */
export function isValidDate(date: Date | string | number): boolean {
  return validateAndConvertDate(date) !== null;
}