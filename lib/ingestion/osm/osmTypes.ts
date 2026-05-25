// Minimal typing for raw Overpass API JSON (the `[out:json]` response shape).

export interface OsmElementBase {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
}

export interface OsmNode extends OsmElementBase {
  type: "node";
  lat: number;
  lon: number;
}

export interface OsmWay extends OsmElementBase {
  type: "way";
  nodes: number[];
}

export interface OsmRelationMember {
  type: "node" | "way" | "relation";
  ref: number;
  role: string;
}

export interface OsmRelation extends OsmElementBase {
  type: "relation";
  members: OsmRelationMember[];
}

export type OsmElement = OsmNode | OsmWay | OsmRelation;

export interface OverpassResponse {
  version?: number;
  generator?: string;
  elements: OsmElement[];
}
