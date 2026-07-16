import type { StyleSpecification } from "maplibre-gl";

export const POSITRON_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron";

export const AGED_PAPER_PALETTE = {
  land: "#EBE3D2",
  water: "#A9BFC9",
  majorRoad: "#D8C9A8",
  minorRoad: "#E0D2B4",
  greenery: "#DAD8C0",
  text: "#5A4A38",
  textHalo: "#EBE3D2",
} as const;

type RecolorableLayer = {
  id: string;
  type: string;
  paint?: Record<string, unknown>;
};

type RecolorableStyle = Omit<StyleSpecification, "layers"> & {
  layers: RecolorableLayer[];
};

const MAJOR_ROAD_LAYER = /motorway|trunk|primary|major/;
const MINOR_ROAD_LAYER = /road|highway|minor|service|track|path|pier|railway/;
const GREEN_LAYER = /park|landcover|wood|green|garden|grass/;
const WATER_LAYER = /water|marine/;
const LAND_LAYER = /background|land|building|aeroway/;

function colorForLayer(id: string) {
  if (WATER_LAYER.test(id)) return AGED_PAPER_PALETTE.water;
  if (GREEN_LAYER.test(id)) return AGED_PAPER_PALETTE.greenery;
  if (MAJOR_ROAD_LAYER.test(id)) return AGED_PAPER_PALETTE.majorRoad;
  if (MINOR_ROAD_LAYER.test(id)) return AGED_PAPER_PALETTE.minorRoad;
  if (LAND_LAYER.test(id)) return AGED_PAPER_PALETTE.land;

  return undefined;
}

function recolorLayer(layer: RecolorableLayer): RecolorableLayer {
  const paint = { ...layer.paint };

  if (layer.type === "symbol") {
    return {
      ...layer,
      paint: {
        ...paint,
        "text-color": AGED_PAPER_PALETTE.text,
        "text-halo-color": AGED_PAPER_PALETTE.textHalo,
      },
    };
  }

  const color = colorForLayer(layer.id);
  if (!color) return layer;

  const colorProperty =
    layer.type === "background"
      ? "background-color"
      : layer.type === "line"
      ? "line-color"
      : "fill-color";

  return {
    ...layer,
    paint: {
      ...paint,
      [colorProperty]: color,
    },
  };
}

/** Returns a Positron style document recolored for Murmur's aged-paper map. */
export function recolorPositronStyle(
  style: StyleSpecification
): StyleSpecification {
  const recolorableStyle = style as unknown as RecolorableStyle;

  return {
    ...recolorableStyle,
    layers: recolorableStyle.layers.map(recolorLayer),
  } as StyleSpecification;
}

/** Fetches OpenFreeMap's Positron style at runtime, then applies the aged-paper palette. */
export async function loadAgedPaperPositronStyle(
  signal?: AbortSignal
): Promise<StyleSpecification> {
  const response = await fetch(POSITRON_STYLE_URL, { signal });

  if (!response.ok) {
    throw new Error(
      `Unable to load the OpenFreeMap Positron style (${response.status}).`
    );
  }

  const style: unknown = await response.json();
  if (
    typeof style !== "object" ||
    style === null ||
    !("layers" in style) ||
    !Array.isArray(style.layers)
  ) {
    throw new Error("OpenFreeMap returned an invalid Positron style document.");
  }

  return recolorPositronStyle(style as StyleSpecification);
}
