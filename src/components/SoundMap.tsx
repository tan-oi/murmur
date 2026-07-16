import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { Cassette } from "./Casette";
import { createRoot } from "react-dom/client";
import { loadAgedPaperPositronStyle } from "#/lib/aged-paper-style";

export function SoundMap() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const controller = new AbortController();
    let map: maplibregl.Map | undefined;

    void loadAgedPaperPositronStyle(controller.signal)
      .then((style) => {
        if (controller.signal.aborted || !ref.current) return;

        map = new maplibregl.Map({
          container: ref.current,
          style,
          center: [88.3639, 22.5726],
          zoom: 12,
        });
        const pins = [
          {
            id: 1,
            title: "Park Street",
            lng: 88.352,
            lat: 22.551,
            audioUrl: "/test.mp3",
          },
          {
            id: 2,
            title: "Howrah Bridge",
            lng: 88.3468,
            lat: 22.5851,
            audioUrl: "/test2.mp3",
          },
        ];

        pins.forEach((pin) => {
          const el = document.createElement("div");
          el.style.cursor = "pointer";

          // draw the React cassette into that div
          createRoot(el).render(<Cassette isPlaying={false} />);

          // hand the div to MapLibre as the marker
          new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([pin.lng, pin.lat])
            .addTo(map);

          const audio = new Audio(pin.audioUrl);
          el.addEventListener("click", () => audio.play());
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(
            "Unable to initialize the aged-paper map style.",
            error
          );
        }
      });

    return () => {
      controller.abort();
      map?.remove();
    };
  }, []);
  return <div ref={ref} style={{ width: "100%", height: "100vh" }} />;
}
