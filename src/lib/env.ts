import {z} from "zod";

export const env = z
  .object({
    NEXT_PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  })
  .parse({NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL});
