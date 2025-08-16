/**
 * Security utilities for protecting sensitive data in the Chrome extension
 * Implements encryption, validation, and secure storage practices
 */

class SecurityManager {
  constructor() {
    this.keyDerivationIterations = 100000;
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
  }

  /**
   * Generate a cryptographic key from extension ID and user context
   */
  async generateKey() {
    try {
      const extensionId = chrome.runtime.id;
      const userAgent = navigator.userAgent;
      const timestamp = Date.now().toString();
      
      // Create a unique seed from extension context
      const seed = `${extensionId}-${userAgent}-${timestamp}`;
      const encoder = new TextEncoder();
      const seedBuffer = encoder.encode(seed);
      
      // Derive key using PBKDF2
      const baseKey = await crypto.subtle.importKey(
        'raw',
        seedBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );
      
      // Use extension ID as salt for consistency
      const salt = encoder.encode(extensionId);
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.keyDerivationIterations,
          hash: 'SHA-256'
        },
        baseKey,
        {
          name: this.algorithm,
          length: this.keyLength
        },
        false,
        ['encrypt', 'decrypt']
      );
      
      return derivedKey;
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encrypt(plaintext) {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Invalid plaintext data');
      }

      const key = await this.generateKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        data
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data');
      }

      const key = await this.generateKey();
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, this.ivLength);
      const encrypted = combined.slice(this.ivLength);
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Validate Tikkie URL format and security
   */
  validateTikkieUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required' };
    }

    // Remove whitespace
    url = url.trim();

    if (url.length === 0) {
      return { valid: true, url: '' }; // Allow empty URL
    }

    // Check basic URL format
    try {
      const urlObj = new URL(url);
      
      // Validate Tikkie domain
      const allowedDomains = [
        'tikkie.me',
        'www.tikkie.me',
        'app.tikkie.me'
      ];
      
      if (!allowedDomains.includes(urlObj.hostname.toLowerCase())) {
        return { 
          valid: false, 
          error: 'Only official Tikkie URLs (tikkie.me) are allowed' 
        };
      }

      // Validate protocol
      if (urlObj.protocol !== 'https:') {
        return { 
          valid: false, 
          error: 'Only HTTPS URLs are allowed for security' 
        };
      }

      // Check for suspicious patterns
      if (this.containsSuspiciousPatterns(url)) {
        return { 
          valid: false, 
          error: 'URL contains suspicious patterns' 
        };
      }

      return { valid: true, url: url };
    } catch (error) {
      return { 
        valid: false, 
        error: 'Invalid URL format' 
      };
    }
  }

  /**
   * Check for suspicious patterns in URLs
   */
  containsSuspiciousPatterns(url) {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /eval\(/i,
      /alert\(/i,
      /document\./i,
      /window\./i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Sanitize URL for safe display
   */
  sanitizeUrlForDisplay(url) {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Remove any HTML/script content
    return url
      .replace(/[<>'"]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .trim();
  }

  /**
   * Generate secure hash for integrity checking
   */
  async generateHash(data) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      return btoa(String.fromCharCode(...hashArray));
    } catch (error) {
      console.error('Hash generation failed:', error);
      throw new Error('Failed to generate hash');
    }
  }

  /**
   * Verify data integrity
   */
  async verifyHash(data, expectedHash) {
    try {
      const actualHash = await this.generateHash(data);
      return actualHash === expectedHash;
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Rate limiting for sensitive operations
   */
  checkRateLimit(operation, maxAttempts = 5, windowMs = 60000) {
    const key = `rateLimit_${operation}`;
    const now = Date.now();
    
    // Get stored attempts
    const stored = localStorage.getItem(key);
    let attempts = stored ? JSON.parse(stored) : [];
    
    // Remove old attempts outside the window
    attempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (attempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...attempts);
      const waitTime = windowMs - (now - oldestAttempt);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    // Add current attempt
    attempts.push(now);
    localStorage.setItem(key, JSON.stringify(attempts));
    
    return true;
  }

  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData(obj) {
    if (typeof obj === 'string') {
      // Overwrite string memory (best effort)
      return obj.replace(/./g, '0');
    } else if (obj instanceof ArrayBuffer || obj instanceof Uint8Array) {
      // Clear buffer
      if (obj instanceof ArrayBuffer) {
        new Uint8Array(obj).fill(0);
      } else {
        obj.fill(0);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      // Clear object properties
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = null;
        }
      }
    }
  }

  /**
   * Validate extension context for security
   */
  validateExtensionContext() {
    // Check if running in proper extension context
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      throw new Error('Invalid extension context');
    }

    // Check if extension ID matches expected pattern
    const extensionId = chrome.runtime.id;
    if (!/^[a-z]{32}$/.test(extensionId)) {
      throw new Error('Invalid extension ID format');
    }

    // Verify we're not in an iframe or malicious context
    if (window.top !== window.self) {
      throw new Error('Extension running in unsafe iframe context');
    }

    return true;
  }

  /**
   * Log security events for monitoring
   */
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      extensionId: chrome.runtime.id,
      url: window.location.href,
      userAgent: navigator.userAgent,
      details: details
    };

    console.log('Security Event:', logEntry);
    
    // Store in extension storage for audit trail (limited retention)
    this.storeSecurityLog(logEntry);
  }

  /**
   * Store security logs with automatic cleanup
   */
  async storeSecurityLog(logEntry) {
    try {
      const result = await chrome.storage.local.get(['securityLogs']);
      let logs = result.securityLogs || [];
      
      // Add new log
      logs.push(logEntry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs = logs.slice(-100);
      }
      
      // Remove logs older than 7 days
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      logs = logs.filter(log => new Date(log.timestamp).getTime() > weekAgo);
      
      await chrome.storage.local.set({ securityLogs: logs });
    } catch (error) {
      console.error('Failed to store security log:', error);
    }
  }
}

// Export singleton instance
const securityManager = new SecurityManager();

// Make available globally for extension use
if (typeof window !== 'undefined') {
  window.securityManager = securityManager;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = securityManager;
}
