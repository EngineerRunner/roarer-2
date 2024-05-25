import { z } from "zod";
import { individualRelationshipPacketSchema } from "./schemas/relationship";
import { banSchema } from "./schemas/ban";

export const loginSchema = z.object({
  mode: z.literal("auth"),
  payload: z.object({
    username: z.string(),
    token: z.string(),
    relationships: individualRelationshipPacketSchema.array(),
    account: z.object({
      ban: banSchema,
    }),
  }),
});
