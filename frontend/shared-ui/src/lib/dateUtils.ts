/**
 * Calculate the number of days between a past date and now
 * @param dateString - ISO date string or date that can be parsed by Date constructor
 * @returns Number of days elapsed (rounded up)
 */
export const daysSince = (dateString: string): number => {
  try {
    const pastDate = new Date(dateString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(pastDate.getTime())) {
      console.warn(`Invalid date string: ${dateString}`);
      return 0;
    }
    
    const diffMs = now.getTime() - pastDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error(`Error calculating days since: ${dateString}`, error);
    return 0;
  }
};
