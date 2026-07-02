export interface QuakeEvent {
  id: string;
  lat: number;
  lon: number;
  depth: number;
  mag: number;
  locationName: string;
  time: number; // Timestamp en milisegundos
  isUpdate: boolean;
}
