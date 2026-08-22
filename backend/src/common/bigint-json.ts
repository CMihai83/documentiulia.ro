/**
 * REQ-049 B2: Prisma returns BigInt for AuditLog.sequence (and similar
 * columns); JSON.stringify throws on BigInt, so any endpoint returning such
 * rows 500'd for accounts that had them. Serialize as string, once, for every
 * entrypoint (imported by PrismaService, which every app loads).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function toJSON() {
  return this.toString();
};
export {};
