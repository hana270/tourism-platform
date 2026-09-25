import crypto from "crypto";

export function createOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeEqual(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const timingSafeEqual = crypto.timingSafeEqual as unknown as (
    a: Uint8Array,
    b: Uint8Array
  ) => boolean;

  const leftBytes = Uint8Array.from(left);
  const rightBytes = Uint8Array.from(right);

  return timingSafeEqual(leftBytes, rightBytes);
}

export function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
