import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isSafari() {
  if (typeof window === 'undefined' || !window.navigator) return false
  const ua = window.navigator.userAgent
  const vendor = window.navigator.vendor
  return /Safari/.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua)
}
