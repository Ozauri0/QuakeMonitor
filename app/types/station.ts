export interface Station {
  id: string;
  lat: number;
  lon: number;
  name: string;
  active: boolean;
  network?: string;
}
