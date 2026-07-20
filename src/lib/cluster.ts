import Supercluster from "supercluster";
import type { SoundPin } from "./pins";

export type ClusterPoint = Supercluster.PointFeature<{ pin: SoundPin }>;
export type ClusterOrPoint = ReturnType<
  Supercluster<{ pin: SoundPin }>["getClusters"]
>[number];

export function buildClusterIndex(pins: SoundPin[]) {
  const index = new Supercluster<{ pin: SoundPin }>({
    radius: 30, // px — smaller = pins must be closer before they group
    maxZoom: 18, // past this, always show individual cassettes
  });
  const points: ClusterPoint[] = pins.map((pin) => ({
    type: "Feature",
    properties: { pin },
    geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
  }));
  index.load(points);
  return index;
}
