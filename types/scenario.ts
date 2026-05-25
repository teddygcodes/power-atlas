export type CampusSizeMW = 50 | 100 | 250 | 500;

export interface DataCenterScenario {
  campusSizeMW: CampusSizeMW;
  coordinates: [number, number]; // [lng, lat]
}
