import { ClientOnly, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { SoundMap } from "#/components/SoundMap";
import { Recorder, type DraftLocation } from "#/components/Recorder";
import { getPins, uploadPin } from "#/server/functions";

export const Route = createFileRoute("/")({
  loader: () => getPins(),
  component: Home,
});

function Home() {
  const pins = Route.useLoaderData();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<DraftLocation | null>(null);

  return (
    <ClientOnly fallback={<div className="p-8">Loading map...</div>}>
      <div className="relative">
        <SoundMap
          pins={pins}
          placing={placing}
          draft={draft}
          onPickLocation={(lng, lat) => setDraft({ lng, lat })}
        />
        <Recorder
          draft={draft}
          onPlacingChange={setPlacing}
          onCancel={() => setDraft(null)}
          onSave={async ({ blob }) => {
            if (!draft) return;
            const form = new FormData();
            form.append("audio", blob, "recording");
            form.append("lng", String(draft.lng));
            form.append("lat", String(draft.lat));
            await uploadPin({ data: form });
            await router.invalidate(); // reload pins → new cassette appears
            setDraft(null);
          }}
        />
      </div>
    </ClientOnly>
  );
}
