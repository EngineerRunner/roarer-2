import { z } from "zod";

export const banSchema = z.object({
  state: z
    .literal("temp_ban")
    .or(z.literal("perm_ban"))
    .or(z.literal("temp_restriction"))
    .or(z.literal("perm_restriction"))
    .or(z.literal("none")),
  restrictions: z.number(),
  reason: z.string(),
  expires: z.number(),
});

export type APIBan = z.infer<typeof banSchema>;
