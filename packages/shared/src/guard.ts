export class EgressBlockedError extends Error {
  constructor(public destination: string, public reason: string) {
    super(`Egress blocked: ${destination} (${reason})`);
    this.name = 'EgressBlockedError';
  }
}

export function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '::1' || h === '127.0.0.1') return true;
  if (h.startsWith('127.')) return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  if (h.startsWith('172.')) {
    const parts = h.split('.');
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return true;
    return false;
  }
  if (h === '::1') return true;
  return false;
}

export function isAllowedIp(ip: string): boolean {
  return isAllowedHost(ip);
}

let blockedCount = 0;
let externalBytes = 0;
let localCount = 0;

export function stats() {
  return { blocked: blockedCount, externalBytes, local: localCount };
}

export function recordBlocked() { blockedCount++; }
export function recordLocal(bytes = 0) { localCount++; externalBytes += bytes; }
export function recordExternal(bytes: number) { externalBytes += bytes; }

export function installGuard() {
  // no-op stub for environment; real enforcement lives in server bootstrap
}
