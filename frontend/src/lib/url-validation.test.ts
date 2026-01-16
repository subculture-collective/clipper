import { describe, it, expect } from 'vitest';
import { isValidUrl, normalizeUrl, validateAndNormalizeUrl } from './url-validation';

describe('isValidUrl', () => {
  it('should validate URLs with https protocol', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://www.example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path')).toBe(true);
    expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
  });

  it('should validate URLs with http protocol', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('http://www.example.com')).toBe(true);
  });

  it('should validate URLs without protocol', () => {
    expect(isValidUrl('example.com')).toBe(true);
    expect(isValidUrl('www.example.com')).toBe(true);
    expect(isValidUrl('example.com/path')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('   ')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('should validate subdomains', () => {
    expect(isValidUrl('subdomain.example.com')).toBe(true);
    expect(isValidUrl('https://subdomain.example.com')).toBe(true);
  });

  it('should validate localhost URLs', () => {
    expect(isValidUrl('localhost')).toBe(true);
    expect(isValidUrl('http://localhost')).toBe(true);
    expect(isValidUrl('localhost:3000')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('http://localhost:3000/path')).toBe(true);
  });

  it('should validate IP addresses', () => {
    expect(isValidUrl('192.168.1.1')).toBe(true);
    expect(isValidUrl('http://192.168.1.1')).toBe(true);
    expect(isValidUrl('192.168.1.1:8080')).toBe(true);
    expect(isValidUrl('http://192.168.1.1:8080/path')).toBe(true);
  });

  it('should reject invalid IP addresses', () => {
    expect(isValidUrl('999.999.999.999')).toBe(false);
    expect(isValidUrl('256.1.1.1')).toBe(false);
    expect(isValidUrl('192.168.1.256')).toBe(false);
    expect(isValidUrl('1.2.3.999')).toBe(false);
  });

  it('should reject potentially malicious URLs', () => {
    // javascript: protocol
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    
    // data: protocol
    expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    
    // file: protocol
    expect(isValidUrl('file:///etc/passwd')).toBe(false);
    
    // ftp: protocol
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });
});

describe('normalizeUrl', () => {
  it('should preserve URLs with protocol', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should add https protocol to URLs without protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
  });

  it('should handle empty strings', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });
});

describe('validateAndNormalizeUrl', () => {
  it('should return normalized URL for valid URLs', () => {
    expect(validateAndNormalizeUrl('example.com')).toBe('https://example.com');
    expect(validateAndNormalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should return null for invalid URLs', () => {
    expect(validateAndNormalizeUrl('')).toBe(null);
    expect(validateAndNormalizeUrl('not a url')).toBe(null);
    expect(validateAndNormalizeUrl('ftp://example.com')).toBe(null);
  });
});
