/**
 * Utility functions for parsing and validating otpauth:// URIs
 */

export interface OTPAuthData {
    type: 'totp' | 'hotp';
    issuer?: string;
    account?: string;
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    counter?: number;
}

/**
 * Parse an otpauth:// URI
 * Format: otpauth://totp/Issuer:account?secret=BASE32SECRET&issuer=Issuer&algorithm=SHA1&digits=6&period=30
 */
export function parseOTPAuthURI(uri: string): OTPAuthData | null {
    try {
        // Validate URI format
        if (!uri.startsWith('otpauth://')) {
            return null;
        }

        const url = new URL(uri);
        const type = url.hostname as 'totp' | 'hotp';

        if (type !== 'totp' && type !== 'hotp') {
            return null;
        }

        // Get secret from query params (required)
        const secret = url.searchParams.get('secret');
        if (!secret) {
            return null;
        }

        // Parse label (format: Issuer:account or just account)
        const label = decodeURIComponent(url.pathname.substring(1));
        const labelParts = label.split(':');
        
        let issuer = url.searchParams.get('issuer') || undefined;
        let account = label;

        if (labelParts.length === 2) {
            issuer = issuer || labelParts[0];
            account = labelParts[1];
        } else if (labelParts.length === 1) {
            account = labelParts[0];
        }

        // Parse optional parameters
        const algorithm = url.searchParams.get('algorithm') || undefined;
        const digitsStr = url.searchParams.get('digits');
        const digits = digitsStr ? parseInt(digitsStr, 10) : undefined;
        const periodStr = url.searchParams.get('period');
        const period = periodStr ? parseInt(periodStr, 10) : undefined;
        const counterStr = url.searchParams.get('counter');
        const counter = counterStr ? parseInt(counterStr, 10) : undefined;

        return {
            type,
            issuer,
            account,
            secret,
            algorithm,
            digits,
            period,
            counter,
        };
    } catch (error) {
        console.error('Error parsing otpauth URI:', error);
        return null;
    }
}

/**
 * Validate that an otpauth URI contains required fields
 */
export function validateOTPAuthData(data: OTPAuthData | null): boolean {
    if (!data) {
        return false;
    }

    // Required: type and secret
    if (!data.type || !data.secret) {
        return false;
    }

    // Secret should be base32 (A-Z, 2-7, and optional padding =)
    if (!/^[A-Z2-7]+=*$/i.test(data.secret)) {
        return false;
    }

    // Validate digits if present
    if (data.digits !== undefined && (data.digits < 6 || data.digits > 8)) {
        return false;
    }

    // Validate period if present (for TOTP)
    if (data.type === 'totp' && data.period !== undefined && data.period < 1) {
        return false;
    }

    // Validate counter if present (for HOTP)
    if (data.type === 'hotp' && data.counter !== undefined && data.counter < 0) {
        return false;
    }

    return true;
}

/**
 * Format OTPAuth data for display
 */
export function formatOTPAuthForDisplay(data: OTPAuthData): string {
    const parts: string[] = [];
    
    if (data.issuer) {
        parts.push(`Issuer: ${data.issuer}`);
    }
    
    if (data.account) {
        parts.push(`Account: ${data.account}`);
    }
    
    parts.push(`Type: ${data.type.toUpperCase()}`);
    
    if (data.digits) {
        parts.push(`Digits: ${data.digits}`);
    }
    
    if (data.period && data.type === 'totp') {
        parts.push(`Period: ${data.period}s`);
    }
    
    return parts.join('\n');
}
