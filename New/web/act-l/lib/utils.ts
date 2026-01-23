import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format playtime in minutes to a human-readable string
 */
export function formatPlaytime(minutes?: number): string {
  if (!minutes || minutes === 0) return 'Nie grano';
  
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} godz.`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (remainingHours === 0) {
    return `${days} dni`;
  }
  
  return `${days} dni ${remainingHours} godz.`;
}

/**
 * Format last played date to relative time
 */
export function formatLastPlayed(dateString?: string): string {
  if (!dateString) return 'Nigdy nie grano';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 5) return 'Teraz';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tyg. temu`;
  
  return date.toLocaleDateString('pl-PL', { 
    day: 'numeric', 
    month: 'short', 
    year: diffDays > 365 ? 'numeric' : undefined 
  });
}

/**
 * Format file size in bytes
 */
export function formatBytes(bytes?: number): string {
  if (!bytes) return 'Nieznany';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
