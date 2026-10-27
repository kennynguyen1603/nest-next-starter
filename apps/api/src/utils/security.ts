import crypto from 'crypto';
import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  browser?: string;
  browserVersion?: string;
  os?: string;
  platform?: string;
  device?: string;
}

export interface SecurityContext {
  ip: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
}

// Never read forwarding headers directly: any client can forge them. Express
// derives req.ip from X-Forwarded-For only across the hops allowed by the
// `trust proxy` setting (TRUST_PROXY), so it is the only safe source.
export function getClientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
}

export function parseUserAgent(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name,
    browserVersion: result.browser.version,
    os: result.os.name,
    platform: result.device.type ?? 'desktop',
    device: result.device.model ?? result.os.name,
  };
}

export function formatDeviceName(deviceInfo: DeviceInfo): string {
  const parts: string[] = [];
  if (deviceInfo.browser) {
    const major = deviceInfo.browserVersion?.split('.')[0];
    parts.push(major ? `${deviceInfo.browser} ${major}` : deviceInfo.browser);
  }
  if (deviceInfo.os) parts.push(`on ${deviceInfo.os}`);
  return parts.join(' ') || 'Unknown Device';
}

export function getSecurityContext(req: Request): SecurityContext {
  // x-forwarded-user-agent lets server-side frontends (Next.js server actions)
  // pass the browser's real UA instead of Node.js's default "node" UA.
  const userAgent =
    (req.headers['x-forwarded-user-agent'] as string | undefined) ||
    req.headers['user-agent'] ||
    'unknown';

  return {
    ip: getClientIp(req),
    userAgent,
    deviceInfo: parseUserAgent(userAgent),
  };
}

export function generateDeviceId(userAgent?: string): string {
  return crypto
    .createHash('sha256')
    .update(userAgent ?? 'unknown')
    .digest('hex')
    .slice(0, 32);
}
