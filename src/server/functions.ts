import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import { pins, reports } from "./schema";
import { eq } from "drizzle-orm";

/** all live pins for the map, oldest first */
export const getPins = createServerFn().handler(async () => {
  return db.select().from(pins).where(eq(pins.status, "live"));
});

/** contribute flow: audio blob + coords → storage file + pin row */
export const uploadPin = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    const audio = data.get("audio");
    const lng = Number(data.get("lng"));
    const lat = Number(data.get("lat"));
    if (!(audio instanceof File) || audio.size === 0)
      throw new Error("missing audio");
    if (!Number.isFinite(lng) || !Number.isFinite(lat))
      throw new Error("missing location");
    return { audio, lng, lat };
  })
  .handler(async ({ data: { audio, lng, lat } }) => {
    const ext = audio.type.includes("webm")
      ? "webm"
      : audio.name.split(".").pop() ?? "audio";
    const path = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const res = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/recordings/${path}`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": audio.type || "application/octet-stream",
        },
        body: await audio.arrayBuffer(),
      }
    );
    if (!res.ok) throw new Error(`storage upload failed: ${await res.text()}`);
    const audioUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/recordings/${path}`;

    const [pin] = await db
      .insert(pins)
      .values({ lat, lng, audioUrl })
      .returning();

    return pin;
  });

/** listener flags a recording */
export const reportPin = createServerFn({ method: "POST" })
  .validator((data: { pinId: string; reason: string }) => ({
    pinId: data.pinId,
    reason: data.reason.slice(0, 500),
  }))
  .handler(async ({ data: { pinId, reason } }) => {
    const [report] = await db
      .insert(reports)
      .values({ pinId, reason })
      .returning();

    return report;
  });
