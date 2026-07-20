import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSelector } from "@xstate/react";
import { SoundMap } from "#/components/SoundMap";
import { Recorder } from "#/components/Recorder";
import { PlaybackDialog } from "#/components/PlaybackDialog";
import { CityToggle } from "#/components/CityToggle";
import { getPins } from "#/server/functions";
import { inputActor, playerActor } from "#/machines/actors/app";
import type { SoundPin } from "#/lib/pins";
import { loadAgedPaperPositronStyle } from "#/lib/aged-paper-style";
import { CITIES, DEFAULT_CITY } from "#/lib/cities";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [pins, mapStyle] = await Promise.all([
      getPins(),
      loadAgedPaperPositronStyle(),
    ]);
    return { pins, mapStyle };
  },
  component: Home,
});

function Home() {
  const { pins, mapStyle } = Route.useLoaderData();
  const placing = useSelector(inputActor, (s) => s.matches("placing"));
  const location = useSelector(inputActor, (s) => s.context.location);
  // reels spin on whichever cassette the deck is actually sounding
  const playingKey = useSelector(playerActor, (s) =>
    s.matches("playing") ? s.context.key : null,
  );
  const [selected, setSelected] = useState<{
    pin: SoundPin;
    index: number;
  } | null>(null);
  const [cityId, setCityId] = useState(DEFAULT_CITY.id);
  const city = CITIES.find((c) => c.id === cityId) ?? DEFAULT_CITY;

  return (
    <ClientOnly fallback={<div className="p-8">Loading map...</div>}>
      <div className="relative">
        <SoundMap
          pins={pins}
          city={city}
          mapStyle={mapStyle}
          activePinId={
            playingKey?.startsWith("pin-") ? playingKey.slice(4) : null
          }
          placing={placing}
          draft={placing ? location : null}
          onPickLocation={(lng, lat) =>
            inputActor.send({ type: "PICK", lng, lat })
          }
          onSelectPin={(pin, index) => setSelected({ pin, index })}
        />
        <CityToggle activeId={city.id} onSelect={setCityId} />
        <Recorder />
        {selected && (
          <PlaybackDialog
            pin={selected.pin}
            index={selected.index}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </ClientOnly>
  );
}
