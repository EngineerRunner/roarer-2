import { z } from "zod";

export type APIChat = z.infer<typeof chatSchema>;
export const chatSchema = z
  .object({
    created: z.number(),
    deleted: z.boolean(),
    last_active: z.number(),
    members: z.string().array(),
    type: z.number(),
    _id: z.string(),
  })
  .and(
    z
      .object({
        nickname: z.string().nullable(),
        owner: z.string(),
      })
      .or(
        z.object({
          nickname: z.null(),
          owner: z.null(),
        }),
      ),
  );
