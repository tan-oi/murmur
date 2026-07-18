import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useState, useRef } from "react";
import { Cassette } from "./Cassette";
import type { SoundPin } from "#/lib/pins";

export function SoundMap({
  pins,
  placing = false,
  draft = null,
  onPickLocation,
}: {
  pins: SoundPin[];
  placing?: boolean;
  draft?: { lng: number; lat: number } | null;
  onPickLocation?: (lng: number, lat: number) => void;
}) {
  const [zoom, setZoom] = useState(12);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = (pin: SoundPin) => {
    if (placing) return; // while placing, clicks belong to the map

    // stop whatever's playing
    if (audioRef.current) audioRef.current.pause();

    if (playingId === pin.id) {
      // clicking the playing one again = stop it
      setPlayingId(null);
      return;
    }

    // play the new one
    const audio = new Audio(pin.audioUrl);
    audioRef.current = audio;
    audio.play();
    setPlayingId(pin.id);

    audio.onended = () => setPlayingId(null);
  };

  return (
    <Map
      onZoom={(e) => setZoom(e.viewState.zoom)}
      initialViewState={{ longitude: 88.3639, latitude: 22.5726, zoom: 12 }}
      style={{ width: "100%", height: "100vh" }}
      mapStyle="https://tiles.openfreemap.org/styles/positron"
      cursor={placing ? "crosshair" : "auto"}
      onClick={(e) => {
        if (placing && onPickLocation)
          onPickLocation(e.lngLat.lng, e.lngLat.lat);
      }}
    >
      {pins.map((pin, i) => {
        const scale = Math.max(0.5, Math.min(1.4, (zoom - 10) * 0.35));
        return (
          <Marker
            key={pin.id}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
          >
            <div
              onClick={() => handleClick(pin)}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "bottom center",
              }}
            >
              <Cassette
                isPlaying={playingId === pin.id}
                label={String(i + 1).padStart(2, "0")}
              />
            </div>
          </Marker>
        );
      })}

      {draft && (
        <Marker longitude={draft.lng} latitude={draft.lat} anchor="center">
          <div className="relative flex size-6 items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-rec animate-[drop-pulse_1.6s_var(--ease-out-quart)_infinite]" />
            <span className="size-2.5 rounded-full bg-rec ring-2 ring-paper" />
          </div>
        </Marker>
      )}
    </Map>
  );
}
