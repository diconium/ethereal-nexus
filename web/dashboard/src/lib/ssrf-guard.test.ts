/**
 * @jest-environment node
 *
 * Tests for the SSRF guard utility.
 */

import { validateEndpointUrl, SsrfBlockedError } from './ssrf-guard';

describe('validateEndpointUrl — always allowed (any environment)', () => {
  it('allows a public HTTPS URL', () => {
    expect(() => validateEndpointUrl('https://aem.example.com')).not.toThrow();
  });

  it('allows a public HTTP URL', () => {
    expect(() => validateEndpointUrl('http://cms.example.com')).not.toThrow();
  });

  it('allows a URL with a port', () => {
    expect(() => validateEndpointUrl('https://cms.example.com:8443')).not.toThrow();
  });
});

describe('validateEndpointUrl — always blocked (any environment)', () => {
  it('blocks file:// scheme', () => {
    expect(() => validateEndpointUrl('file:///etc/passwd')).toThrow(SsrfBlockedError);
  });

  it('blocks ftp:// scheme', () => {
    expect(() => validateEndpointUrl('ftp://example.com')).toThrow(SsrfBlockedError);
  });

  it('blocks 169.254.x.x (cloud metadata — always blocked)', () => {
    expect(() => validateEndpointUrl('http://169.254.169.254')).toThrow(SsrfBlockedError);
  });

  it('blocks 169.254.0.1 (cloud metadata — always blocked)', () => {
    expect(() => validateEndpointUrl('http://169.254.0.1')).toThrow(SsrfBlockedError);
  });

  it('throws on a non-URL string', () => {
    expect(() => validateEndpointUrl('not-a-url')).toThrow(SsrfBlockedError);
  });

  it('throws on an empty string', () => {
    expect(() => validateEndpointUrl('')).toThrow(SsrfBlockedError);
  });

  it('throws SsrfBlockedError with code SSRF_BLOCKED', () => {
    try {
      validateEndpointUrl('http://169.254.169.254');
      fail('Expected to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SsrfBlockedError);
      expect((e as SsrfBlockedError).code).toBe('SSRF_BLOCKED');
    }
  });
});

describe('validateEndpointUrl — development mode (NODE_ENV=test)', () => {
  // Jest runs with NODE_ENV=test — loopback and private IPs must be ALLOWED.

  it('allows localhost in development', () => {
    expect(() => validateEndpointUrl('http://localhost:4502')).not.toThrow();
  });

  it('allows 127.0.0.1 in development', () => {
    expect(() => validateEndpointUrl('http://127.0.0.1:4502')).not.toThrow();
  });

  it('allows 192.168.x.x in development', () => {
    expect(() => validateEndpointUrl('http://192.168.1.100')).not.toThrow();
  });

  it('allows 10.x.x.x in development', () => {
    expect(() => validateEndpointUrl('http://10.0.0.1')).not.toThrow();
  });
});

describe('validateEndpointUrl — production mode (NODE_ENV=production)', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: ORIGINAL_ENV, writable: true });
  });

  it('blocks 127.0.0.1 in production', () => {
    expect(() => validateEndpointUrl('http://127.0.0.1')).toThrow(SsrfBlockedError);
  });

  it('blocks localhost in production', () => {
    expect(() => validateEndpointUrl('http://localhost')).toThrow(SsrfBlockedError);
  });

  it('blocks ::1 in production', () => {
    expect(() => validateEndpointUrl('http://[::1]')).toThrow(SsrfBlockedError);
  });

  it('blocks 10.x.x.x in production', () => {
    expect(() => validateEndpointUrl('http://10.0.0.1')).toThrow(SsrfBlockedError);
  });

  it('blocks 172.16.x.x in production', () => {
    expect(() => validateEndpointUrl('http://172.16.0.1')).toThrow(SsrfBlockedError);
  });

  it('blocks 172.31.x.x in production', () => {
    expect(() => validateEndpointUrl('http://172.31.255.255')).toThrow(SsrfBlockedError);
  });

  it('allows 172.15.x.x in production (not in private range)', () => {
    expect(() => validateEndpointUrl('http://172.15.0.1')).not.toThrow();
  });

  it('allows 172.32.x.x in production (not in private range)', () => {
    expect(() => validateEndpointUrl('http://172.32.0.1')).not.toThrow();
  });

  it('blocks 192.168.x.x in production', () => {
    expect(() => validateEndpointUrl('http://192.168.1.1')).toThrow(SsrfBlockedError);
  });

  it('still allows public URLs in production', () => {
    expect(() => validateEndpointUrl('https://aem.example.com')).not.toThrow();
  });
});
