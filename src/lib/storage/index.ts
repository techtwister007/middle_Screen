import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/config/env";

/** Minimal blob storage: local disk in dev / self-hosted, S3-compatible (Cloudflare R2) in production. */
export interface Storage {
  /** Stores the object and returns its public URL. */
  put(key: string, data: Buffer | Uint8Array, contentType: string): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  /** A presigned PUT URL for direct browser uploads, or null when the driver doesn't support it (local). */
  presignPut(key: string, contentType: string): Promise<string | null>;
}

function safeKey(key: string) {
  const k = key.replace(/^\/+/, "");
  if (!k || k.split("/").some((p) => p === ".." || p === ".")) throw new Error("invalid storage key");
  return k;
}

function localStorage(): Storage {
  const root = path.resolve(env.LOCAL_STORAGE_DIR);
  const file = (key: string) => path.join(root, safeKey(key));
  return {
    async put(key, data, _type) {
      const f = file(key);
      await mkdir(path.dirname(f), { recursive: true });
      await writeFile(f, data);
      return this.publicUrl(key);
    },
    get: (key) => readFile(file(key)),
    delete: (key) => rm(file(key), { force: true }),
    publicUrl: (key) => `/media/${safeKey(key)}`,
    presignPut: async () => null,
  };
}

function s3Storage(): Storage {
  let clientP: Promise<{ client: import("@aws-sdk/client-s3").S3Client; mod: typeof import("@aws-sdk/client-s3") }> | null = null;
  const conn = () =>
    (clientP ??= import("@aws-sdk/client-s3").then((mod) => ({
      mod,
      client: new mod.S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT || undefined,
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "" },
      }),
    })));
  const Bucket = () => {
    if (!env.S3_BUCKET) throw new Error("S3_BUCKET is not set");
    return env.S3_BUCKET;
  };
  return {
    async put(key, data, ContentType) {
      const { client, mod } = await conn();
      await client.send(new mod.PutObjectCommand({ Bucket: Bucket(), Key: safeKey(key), Body: data, ContentType, CacheControl: "public, max-age=31536000, immutable" }));
      return this.publicUrl(key);
    },
    async get(key) {
      const { client, mod } = await conn();
      const r = await client.send(new mod.GetObjectCommand({ Bucket: Bucket(), Key: safeKey(key) }));
      if (!r.Body) throw new Error("not found");
      return Buffer.from(await r.Body.transformToByteArray());
    },
    async delete(key) {
      const { client, mod } = await conn();
      await client.send(new mod.DeleteObjectCommand({ Bucket: Bucket(), Key: safeKey(key) }));
    },
    publicUrl: (key) => `${(env.S3_PUBLIC_URL ?? "").replace(/\/+$/, "")}/${safeKey(key)}`,
    async presignPut(key, ContentType) {
      const { client, mod } = await conn();
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      return getSignedUrl(client, new mod.PutObjectCommand({ Bucket: Bucket(), Key: safeKey(key), ContentType }), { expiresIn: 900 });
    },
  };
}

export const storage: Storage = env.STORAGE_DRIVER === "s3" ? s3Storage() : localStorage();
