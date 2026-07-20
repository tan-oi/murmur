export type City = {
  id: string;
  name: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  // [[west, south], [east, north]] — keeps the map from wandering off
  bounds: [[number, number], [number, number]];
};

// only Kolkata is live today; add more cities here as murmur grows
export const CITIES: City[] = [
  {
    id: "kolkata",
    name: "Kolkata",
    center: [88.3639, 22.5726],
    zoom: 13.5,
    bounds: [
      [88.15, 22.4],
      [88.55, 22.72],
    ],
  },
];

export const DEFAULT_CITY = CITIES[0];
