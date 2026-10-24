import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAllowedHost, isAllowedIp, EgressBlockedError,
  stats, recordBlocked, recordLocal, recordExternal,
} from './guard';

describe('isAllowedHost', () => {
  it('allows localhost', () => {
    expect(isAllowedHost('localhost')).toBe(true);
  });

  it('allows 127.0.0.1', () => {
    expect(isAllowedHost('127.0.0.1')).toBe(true);
  });

  it('allows IPv6 loopback', () => {
    expect(isAllowedHost('::1')).toBe(true);
  });

  it('allows 10.x.x.x (RFC1918)', () => {
    expect(isAllowedHost('10.0.0.1')).toBe(true);
    expect(isAllowedHost('10.255.255.255')).toBe(true);
  });

  it('allows 192.168.x.x (RFC1918)', () => {
    expect(isAllowedHost('192.168.1.1')).toBe(true);
    expect(isAllowedHost('192.168.100.200')).toBe(true);
  });

  it('allows 172.16-31.x.x (RFC1918)', () => {
    expect(isAllowedHost('172.16.0.1')).toBe(true);
    expect(isAllowedHost('172.31.255.255')).toBe(true);
  });

  it('blocks 172.15.x.x (outside RFC1918 range)', () => {
    expect(isAllowedHost('172.15.0.1')).toBe(false);
  });

  it('blocks 172.32.x.x (outside RFC1918 range)', () => {
    expect(isAllowedHost('172.32.0.1')).toBe(false);
  });

  it('blocks public IPs', () => {
    expect(isAllowedHost('8.8.8.8')).toBe(false);
    expect(isAllowedHost('93.184.216.34')).toBe(false);
    expect(isAllowedHost('1.1.1.1')).toBe(false);
  });

  it('blocks domain names that are not localhost', () => {
    expect(isAllowedHost('example.com')).toBe(false);
    expect(isAllowedHost('openai.com')).toBe(false);
  });
});

describe('EgressBlockedError', () => {
  it('is an Error subclass', () => {
    const e = new EgressBlockedError('8.8.8.8', 'Public IP');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('EgressBlockedError');
    expect(e.destination).toBe('8.8.8.8');
    expect(e.reason).toBe('Public IP');
    expect(e.message).toContain('8.8.8.8');
  });
});

describe('guard stats', () => {
  it('recordBlocked increments blocked count', () => {
    const before = stats().blocked;
    recordBlocked();
    expect(stats().blocked).toBe(before + 1);
  });

  it('recordLocal increments local count', () => {
    const before = stats().local;
    recordLocal(0);
    expect(stats().local).toBe(before + 1);
  });

  it('recordExternal adds to externalBytes', () => {
    const before = stats().externalBytes;
    recordExternal(1024);
    expect(stats().externalBytes).toBe(before + 1024);
  });
});
