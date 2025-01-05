import { createHash } from 'crypto-browserify';
import { SanitizationRule } from '../types/analytics';

export function sanitizeData(data: any, rules: SanitizationRule[]): any {
  if (!data) return data;

  let sanitizedData = data;

  for (const rule of rules) {
    switch (rule.type) {
      case 'mask':
        sanitizedData = maskData(sanitizedData, rule);
        break;
      case 'hash':
        sanitizedData = hashData(sanitizedData, rule);
        break;
      case 'categorize':
        sanitizedData = categorizeData(sanitizedData, rule);
        break;
      case 'range':
        sanitizedData = rangeData(sanitizedData, rule);
        break;
      case 'generalize':
        sanitizedData = generalizeData(sanitizedData, rule);
        break;
      case 'validate':
        sanitizedData = validateData(sanitizedData, rule);
        break;
      case 'truncate':
        sanitizedData = truncateData(sanitizedData, rule);
        break;
    }
  }

  return sanitizedData;
}

function maskData(data: string, rule: SanitizationRule): string {
  if (typeof data !== 'string') return data;

  const { pattern, replacement, keepLast } = rule;
  if (!pattern || !replacement) return data;

  if (keepLast) {
    const lastChars = data.slice(-keepLast);
    const maskedPart = data.slice(0, -keepLast).replace(new RegExp(pattern, 'g'), replacement);
    return maskedPart + lastChars;
  }

  return data.replace(new RegExp(pattern, 'g'), replacement);
}

function hashData(data: string, rule: SanitizationRule): string {
  if (typeof data !== 'string') return data;

  const { algorithm = 'sha256' } = rule;
  return createHash(algorithm).update(data).digest('hex');
}

function categorizeData(data: string, rule: SanitizationRule): string {
  if (!rule.categories || !Array.isArray(rule.categories)) return data;

  // Find the most appropriate category
  for (const category of rule.categories) {
    if (data.toLowerCase().includes(category.toLowerCase())) {
      return category;
    }
  }

  return 'other';
}

function rangeData(value: number, rule: SanitizationRule): string {
  if (typeof value !== 'number' || !rule.ranges) return value;

  const ranges = rule.ranges;
  if (ranges.length === 3) { // Assuming ['low', 'medium', 'high']
    if (value <= 33) return ranges[0];
    if (value <= 66) return ranges[1];
    return ranges[2];
  }

  return ranges[0]; // Default to first range if structure doesn't match
}

function generalizeData(data: any, rule: SanitizationRule): any {
  if (rule.mappings) {
    return rule.mappings[data] || data;
  }

  if (rule.level === 'city' && typeof data === 'object') {
    // Remove specific address information, keep only city
    return {
      city: data.city,
      country: data.country
    };
  }

  return data;
}

function validateData(data: any, rule: SanitizationRule): any {
  if (!rule.allowedTypes) return data;

  const type = typeof data;
  if (!rule.allowedTypes.includes(type)) {
    return null; // or a default value based on requirements
  }

  return data;
}

function truncateData(data: string, rule: SanitizationRule): string {
  if (typeof data !== 'string' || !rule.maxLength) return data;

  return data.slice(0, rule.maxLength);
}

// Utility function to check if data contains PHI
export function containsPHI(data: any): boolean {
  const phiPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone number
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b(Dr|Mr|Mrs|Ms|Miss)\s[A-Za-z]+\b/, // Names with titles
    /\b\d{1,5}\s[A-Za-z\s]{1,20}\s(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/i // Addresses
  ];

  const dataString = JSON.stringify(data).toLowerCase();
  return phiPatterns.some(pattern => pattern.test(dataString));
}
