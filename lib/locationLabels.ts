export interface LocationLabel {
  lat: number;
  lng: number;
  name: string;
  type: "city" | "region";
  importance?: number; // 1–10, useful for future zoom-based filtering
}

/**
 * Location labels for Chile.
 * Extend this array or create new ones for other countries.
 * The GlobeView component renders these alongside station labels.
 */
export const CHILE_LOCATIONS: LocationLabel[] = [
  // Major cities (coordinates verified against geonames.org / Google Maps)
  { name: "Santiago", lat: -33.45, lng: -70.67, type: "city", importance: 10 },
  { name: "Valparaíso", lat: -33.04, lng: -71.63, type: "city", importance: 8 },
  { name: "Concepción", lat: -36.83, lng: -73.05, type: "city", importance: 8 },
  { name: "La Serena", lat: -29.90, lng: -71.25, type: "city", importance: 7 },
  { name: "Antofagasta", lat: -23.65, lng: -70.40, type: "city", importance: 7 },
  { name: "Temuco", lat: -38.74, lng: -72.60, type: "city", importance: 7 },
  { name: "Iquique", lat: -20.22, lng: -70.14, type: "city", importance: 7 },
  { name: "Puerto Montt", lat: -41.47, lng: -72.94, type: "city", importance: 7 },
  { name: "Talca", lat: -35.43, lng: -71.67, type: "city", importance: 6 },
  { name: "Arica", lat: -18.48, lng: -70.31, type: "city", importance: 6 },
  { name: "Chillán", lat: -36.61, lng: -72.10, type: "city", importance: 6 },
  { name: "Valdivia", lat: -39.81, lng: -73.25, type: "city", importance: 6 },
  { name: "Osorno", lat: -40.29, lng: -73.00, type: "city", importance: 6 },
  { name: "Calama", lat: -22.46, lng: -68.92, type: "city", importance: 5 },
  { name: "Copiapó", lat: -27.37, lng: -70.33, type: "city", importance: 5 },
  { name: "Rancagua", lat: -34.17, lng: -70.74, type: "city", importance: 5 },
  { name: "Curicó", lat: -34.98, lng: -71.24, type: "city", importance: 5 },
  { name: "Los Ángeles", lat: -37.47, lng: -72.35, type: "city", importance: 5 },
  { name: "Quillota", lat: -32.88, lng: -71.25, type: "city", importance: 4 },
  { name: "San Antonio", lat: -33.58, lng: -71.62, type: "city", importance: 4 },
  { name: "Coyhaique", lat: -45.57, lng: -72.07, type: "city", importance: 4 },
  { name: "Punta Arenas", lat: -53.16, lng: -70.91, type: "city", importance: 4 },
  { name: "Puerto Natales", lat: -51.73, lng: -72.51, type: "city", importance: 3 },
  { name: "Viña del Mar", lat: -33.02, lng: -71.56, type: "city", importance: 6 },

  // Regions (centroids placed away from capitals to avoid overlap)
  { name: "Arica y Parinacota", lat: -18.50, lng: -69.80, type: "region", importance: 6 },
  { name: "Tarapacá", lat: -20.30, lng: -69.00, type: "region", importance: 6 },
  { name: "Antofagasta", lat: -23.70, lng: -69.00, type: "region", importance: 6 },
  { name: "Atacama", lat: -27.00, lng: -69.50, type: "region", importance: 6 },
  { name: "Coquimbo", lat: -29.80, lng: -70.80, type: "region", importance: 6 },
  { name: "Valparaíso", lat: -32.60, lng: -70.80, type: "region", importance: 7 },
  { name: "Metropolitana", lat: -33.50, lng: -70.30, type: "region", importance: 8 },
  { name: "O'Higgins", lat: -34.20, lng: -70.70, type: "region", importance: 6 },
  { name: "Maule", lat: -35.50, lng: -71.50, type: "region", importance: 6 },
  { name: "Ñuble", lat: -36.60, lng: -71.80, type: "region", importance: 6 },
  { name: "Biobío", lat: -37.00, lng: -72.20, type: "region", importance: 7 },
  { name: "La Araucanía", lat: -38.70, lng: -72.30, type: "region", importance: 6 },
  { name: "Los Ríos", lat: -39.80, lng: -72.80, type: "region", importance: 6 },
  { name: "Los Lagos", lat: -41.30, lng: -72.50, type: "region", importance: 6 },
  { name: "Aysén", lat: -46.00, lng: -72.50, type: "region", importance: 5 },
  { name: "Magallanes", lat: -52.00, lng: -71.50, type: "region", importance: 5 },
];
