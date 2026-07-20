import Map, { Marker, useMap } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type Supercluster from "supercluster";
import { Cassette } from "./Cassette";
import { ClusterCassette } from "./ClusterCassette";
import type { SoundPin } from "#/lib/pins";
import { buildClusterIndex } from "#/lib/cluster";
import type { City } from "#/lib/cities";

function ClusteredMarkers({
  pins,
  zoom,
  moveTick,
  activePinId,
  placing,
  onSelectPin,
}: {
  pins: SoundPin[];
  zoom: number;
  /** bumped on every pan/zoom/rotate so clusters recompute for the new viewport */
  moveTick: number;
  activePinId: string | null;
  placing: boolean;
  onSelectPin?: (pin: SoundPin, index: number) => void;
}) {
  const { current: map } = useMap();
  const index = useMemo(() => buildClusterIndex(pins), [pins]);
  const reduceMotion = useReducedMotion();

  const clusters = useMemo(() => {
    if (!map) return [];
    const b = map.getBounds();
    return index.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      Math.round(zoom),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- moveTick stands in for the bounds, which change on every pan
  }, [index, map, zoom, moveTick]);

  const scale = Math.max(0.5, Math.min(1.4, (zoom - 10) * 0.35));

  // pop in on arrival, pop out on merge/removal — instant if reduced motion
  const pop = reduceMotion
    ? { initial: false, exit: undefined, transition: { duration: 0 } }
    : {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 },
        transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] as const },
      };

  return (
    <AnimatePresence>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        const isCluster = "cluster" in c.properties && c.properties.cluster;

        if (isCluster) {
          const props = c.properties as Supercluster.ClusterProperties;
          const count = props.point_count;
          const clusterId = props.cluster_id;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: "bottom center" }}>
                <motion.div {...pop}>
                  <ClusterCassette
                    count={count}
                    onClick={() => {
                      const nextZoom = Math.min(
                        index.getClusterExpansionZoom(clusterId),
                        18,
                      );
                      map?.flyTo({
                        center: [lng, lat],
                        zoom: nextZoom,
                        duration: 1800,
                        curve: 1.4, // higher = more of a dramatic zoom-out-then-in arc
                        easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out-cubic
                      });
                    }}
                  />
                </motion.div>
              </div>
            </Marker>
          );
        }

        const pin = c.properties.pin as SoundPin;
        const index_ = pins.findIndex((p) => p.id === pin.id);
        return (
          <Marker key={pin.id} longitude={pin.lng} latitude={pin.lat} anchor="bottom">
            <div style={{ transform: `scale(${scale})`, transformOrigin: "bottom center" }}>
              <motion.div
                {...pop}
                onClick={() => {
                  if (!placing) onSelectPin?.(pin, index_);
                }}
              >
                <Cassette
                  isPlaying={activePinId === pin.id}
                  label={String(index_ + 1).padStart(2, "0")}
                />
              </motion.div>
            </div>
          </Marker>
        );
      })}
    </AnimatePresence>
  );
}

export function SoundMap({
  pins,
  city,
  mapStyle,
  activePinId = null,
  placing = false,
  draft = null,
  onPickLocation,
  onSelectPin,
}: {
  pins: SoundPin[];
  city: City;
  /** pre-fetched aged-paper style (see lib/aged-paper-style.ts); falls back to plain Positron if not yet loaded */
  mapStyle?: StyleSpecification;
  /** pin whose dialog is open — its cassette reels spin */
  activePinId?: string | null;
  placing?: boolean;
  draft?: { lng: number; lat: number } | null;
  onPickLocation?: (lng: number, lat: number) => void;
  onSelectPin?: (pin: SoundPin, index: number) => void;
}) {
  const [zoom, setZoom] = useState(city.zoom);
  const [moveTick, setMoveTick] = useState(0);

  return (
    <Map
      id="murmur"
      key={city.id}
      onMove={(e) => {
        setZoom(e.viewState.zoom);
        setMoveTick((t) => t + 1); // pan alone doesn't change zoom — force a recompute
      }}
      initialViewState={{
        longitude: city.center[0],
        latitude: city.center[1],
        zoom: city.zoom,
      }}
      maxBounds={city.bounds}
      style={{ width: "100%", height: "100vh" }}
      mapStyle={mapStyle ?? "https://tiles.openfreemap.org/styles/positron"}
      cursor={placing ? "crosshair" : "auto"}
      onClick={(e) => {
        if (placing && onPickLocation)
          onPickLocation(e.lngLat.lng, e.lngLat.lat);
      }}
    >
      <ClusteredMarkers
        pins={pins}
        zoom={zoom}
        moveTick={moveTick}
        activePinId={activePinId}
        placing={placing}
        onSelectPin={onSelectPin}
      />

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
