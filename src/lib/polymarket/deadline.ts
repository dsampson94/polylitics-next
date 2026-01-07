/**
 * Deadline Detection
 * Utilities for detecting and analyzing "by-date" markets
 */

/**
 * Detect if a market is a "by-date" or deadline-based market
 */
export function looksLikeByDateMarket(title: string, rules?: string | null, description?: string | null): boolean {
  const text = `${title} ${rules ?? ""} ${description ?? ""}`.toLowerCase();
  
  const patterns = [
    / by /,
    / before /,
    / by end of /,
    / this year/,
    / this month/,
    / this week/,
    / by \d{4}/,           // "by 2026"
    / before \d{1,2}\/\d{1,2}/,  // "before 3/31"
    / by [a-z]+ \d{1,2}/,  // "by March 31"
    /deadline/,
    /\d{4}$/,              // ends with year
  ];

  return patterns.some(pattern => pattern.test(text));
}

/**
 * Extract deadline date from market text
 */
export function extractDeadline(title: string, rules?: string | null, endDate?: Date | null): Date | null {
  // First try the explicit end date
  if (endDate) return endDate;

  const text = `${title} ${rules ?? ""}`;
  
  // Try various date patterns
  const patterns = [
    /by (\w+ \d{1,2}, \d{4})/i,           // "by March 31, 2026"
    /before (\w+ \d{1,2}, \d{4})/i,       // "before April 1, 2026"
    /(\d{1,2}\/\d{1,2}\/\d{4})/,          // "3/31/2026"
    /by end of (\w+ \d{4})/i,             // "by end of March 2026"
    /this year/i,                         // "this year" -> Dec 31 of current year
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        if (match[0].includes("this year")) {
          const year = new Date().getFullYear();
          return new Date(year, 11, 31); // Dec 31
        }
        return new Date(match[1] || match[0]);
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Calculate time remaining in days
 */
export function timeRemainingDays(endDate?: Date | null): number | null {
  if (!endDate) return null;
  
  const now = new Date();
  const end = new Date(endDate);
  const ms = end.getTime() - now.getTime();
  
  return ms > 0 ? ms / (1000 * 60 * 60 * 24) : 0;
}

/**
 * Categorize deadline urgency
 */
export function deadlineUrgency(days?: number | null): "critical" | "urgent" | "moderate" | "distant" | "unknown" {
  if (days === null || days === undefined) return "unknown";
  
  if (days < 7) return "critical";
  if (days < 30) return "urgent";
  if (days < 90) return "moderate";
  return "distant";
}

/**
 * Calculate business days remaining (excluding weekends)
 */
export function businessDaysRemaining(endDate?: Date | null): number | null {
  if (!endDate) return null;
  
  const now = new Date();
  const end = new Date(endDate);
  
  let businessDays = 0;
  const current = new Date(now);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
}
