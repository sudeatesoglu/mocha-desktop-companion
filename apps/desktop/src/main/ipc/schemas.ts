import { z } from 'zod';

/**
 * Runtime schemas for every IPC payload a renderer can send.
 *
 * TypeScript types disappear at runtime, and a compromised renderer can
 * send anything, so the main process validates each payload before use.
 */
export const rendererErrorReportSchema = z.strictObject({
  message: z.string().min(1).max(2_000),
  source: z.string().max(500).optional(),
});
