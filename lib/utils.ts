import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generates a position-based slug for a card
 * Format: {position}-{slugified-title}
 */
export function generateCardSlug(title: string, position: number): string {
  const slug = slugify(title)
  return `${position}-${slug}`
}

/**
 * Parses a card slug to extract position and title slug
 * Returns { position, titleSlug } or null if invalid
 */
export function parseCardSlug(slug: string): { position: number; titleSlug: string } | null {
  const match = slug.match(/^(\d+)-(.+)$/)
  if (!match) return null
  
  const position = parseInt(match[1], 10)
  const titleSlug = match[2]
  
  if (isNaN(position) || position < 1) return null
  
  return { position, titleSlug }
}
