// src/utils/cookies.ts

import { serialize, parse } from 'cookie';
import { NextResponse } from 'next/server';

// Function to set a cookie in the response
export function setCookie(
  res: NextResponse,
  name: string,
  value: unknown,
  options: Record<string,  unknown> = {}
): void {
  const stringValue = typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value);

  if ('maxAge' in options) {
    options.expires = new Date(Date.now() + Number(options.maxAge));
    options.maxAge = Number(options.maxAge) / 1000;
  }

  res.headers.set('Set-Cookie', serialize(name, String(stringValue), options as any));
}

// Function to parse cookies from the request headers
// We're using a type assertion here to ensure we only return defined string values
export function parseCookies(headers: Headers): { [key: string]: string } {
  const cookieHeader = headers.get('cookie') || '';
  const parsedCookies = parse(cookieHeader);
  
  // Filter out any undefined values and assert the type
  return Object.fromEntries(
    Object.entries(parsedCookies).filter(([_, value]) => value !== undefined)
  ) as { [key: string]: string };
}