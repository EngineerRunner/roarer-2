import { z } from "zod";
import { getResponseFromAPIRequest } from "./apiRequest";

export const upload = async (file: File): Promise<UploadReturn> => {
  console.log("Uploading", file);
  const token = await getResponseFromAPIRequest("/uploads/token/icon", {
    auth: true,
    schema: tokenSchema,
  });
  if ("status" in token) {
    return { error: "tokenFail", status: token.status };
  }
  if (file.size > token.max_size) {
    return {
      error: "tooLarge",
      maxSize: token.max_size,
      readableMaxSize: shortenBytes(token.max_size),
    };
  }
  const form = new FormData();
  form.set("file", file);
  const image = imageSchema.parse(
    await (
      await fetch("https://uploads.meower.org/icons", {
        method: "POST",
        body: form,
        headers: {
          Authorization: token.token,
        },
      })
    ).json(),
  );
  return { error: null, image };
};

/**
 * Thank you, StackOverflow :)
 * https://stackoverflow.com/a/42408230
 */
const shortenBytes = (n: number) => {
  const k = n > 0 ? Math.floor(Math.log2(n) / 10) : 0;
  const rank = (k > 0 ? "KMGT"[k - 1] : "") + "b";
  const count = Math.floor(n / Math.pow(1024, k));
  return count + rank;
};

type UploadReturn =
  | {
      error: "tokenFail";
      status: number;
    }
  | {
      error: "tooLarge";
      maxSize: number;
      readableMaxSize: string;
    }
  | {
      error: null;
      image: UploadedImage;
    };

const tokenSchema = z.object({
  expires: z.number(),
  id: z.string(),
  max_size: z.number(),
  token: z.string(),
});

const imageSchema = z.object({
  id: z.string(),
  hash: z.string(),
  mime: z.string(),
  size: z.number(),
  width: z.number(),
  height: z.number(),
  uploaded_by: z.string(),
  uploaded_at: z.number(),
});

export type UploadedImage = z.infer<typeof imageSchema>;
