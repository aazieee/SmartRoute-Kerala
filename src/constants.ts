export const KERALA_LOCATIONS = [
  "Koyilandy",
  "Kozhikode",
  "Malappuram",
  "Kottakkal",
  "Tirur",
  "Valanchery",
  "Kuttippuram",
  "Perinthalmanna",
  "Ponnani",
  "Edappal",
  "Thrissur"
];

export const LOCATION_COORDS: Record<string, { lat: number, lng: number }> = {
  "Koyilandy": { lat: 11.4333, lng: 75.7000 },
  "Kozhikode": { lat: 11.2588, lng: 75.7804 },
  "Malappuram": { lat: 11.0510, lng: 76.0711 },
  "Kottakkal": { lat: 10.9961, lng: 75.9938 },
  "Tirur": { lat: 10.9080, lng: 75.9221 },
  "Valanchery": { lat: 10.9167, lng: 76.0833 },
  "Kuttippuram": { lat: 10.8400, lng: 76.0200 },
  "Perinthalmanna": { lat: 10.9761, lng: 76.2253 },
  "Ponnani": { lat: 10.7700, lng: 75.9200 },
  "Edappal": { lat: 10.7600, lng: 76.0100 },
  "Thrissur": { lat: 10.5276, lng: 76.2144 }
};

export const SCENARIOS = [
  { id: 'normal', label: 'Normal', icon: 'Sun' },
  { id: 'heavy-traffic', label: 'Heavy Traffic', icon: 'TrafficCone' },
  { id: 'rain', label: 'Rain Mode', icon: 'CloudRain' },
  { id: 'emergency', label: 'Emergency', icon: 'AlertCircle' }
];
