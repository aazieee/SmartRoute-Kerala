import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow, TrafficLayer } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Activity, Navigation, Loader2 } from 'lucide-react';
import { Route, ScenarioMode, MapLayers } from '../types';
import { LOCATION_COORDS, KERALA_LOCATIONS } from '../constants';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface MapProps {
  routes: Route[];
  selectedRouteId: string | null;
  hoveredRouteId: string | null;
  onSelectRoute: (id: string) => void;
  scenario: ScenarioMode;
  source: string;
  destination: string;
  layers: MapLayers;
  theme: 'dark' | 'light';
}

const KERALA_BOUNDS = {
  north: 12.8,
  south: 8.0,
  east: 77.5,
  west: 74.5,
};

const INITIAL_CENTER = { lat: 10.9, lng: 76.0 };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px',
};

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#181818" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1b1b1b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#373737" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3c3c3c" }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [{ color: "#4e4e4e" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3d3d3d" }],
  },
];

const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e9e9e9" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
];

export const Map: React.FC<MapProps> = ({ 
  routes, 
  selectedRouteId, 
  hoveredRouteId, 
  onSelectRoute, 
  scenario, 
  source, 
  destination,
  layers,
  theme
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [animatedCoords, setAnimatedCoords] = useState<google.maps.LatLngLiteral[]>([]);
  const animationRef = useRef<number | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const selectedRoute = useMemo(() => 
    routes.find(r => r.id === selectedRouteId), 
    [routes, selectedRouteId]
  );

  // Animate route drawing
  useEffect(() => {
    if (!selectedRoute) {
      setAnimatedCoords([]);
      return;
    }

    const coords = selectedRoute.coordinates.map(c => ({ lat: c[0], lng: c[1] }));
    let currentIdx = 0;
    setAnimatedCoords([]);

    const animate = () => {
      if (currentIdx < coords.length) {
        setAnimatedCoords(prev => [...prev, coords[currentIdx]]);
        currentIdx++;
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [selectedRoute]);

  // Fit bounds when route changes
  useEffect(() => {
    if (map && selectedRoute && selectedRoute.coordinates.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      selectedRoute.coordinates.forEach(c => bounds.extend({ lat: c[0], lng: c[1] }));
      map.fitBounds(bounds, 50);
    }
  }, [map, selectedRoute]);

  const getScenarioOverlay = () => {
    switch (scenario) {
      case 'rain': return 'bg-brand-primary/5 backdrop-blur-[0.5px]';
      case 'heavy-traffic': return 'bg-brand-highlight/5';
      case 'emergency': return 'bg-rose-500/5';
      default: return '';
    }
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-bg rounded-2xl border border-rose-500/20 p-8 text-center">
        <div className="flex flex-col items-center gap-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Map Intelligence Offline</h3>
          <p className="text-brand-text-muted text-sm leading-relaxed">
            We encountered an error loading the Google Maps interface. This may be due to an invalid API key or network restrictions.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono text-brand-text-muted text-left w-full overflow-hidden text-ellipsis">
            Error: {loadError.message}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-8 py-3 rounded-xl bg-brand-primary text-white font-bold hover:bg-brand-primary/80 transition-all shadow-lg shadow-brand-primary/20"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-bg rounded-2xl border border-white/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          <p className="text-brand-text-muted text-xs font-bold uppercase tracking-widest">Initializing Intelligence Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="map" className={cn(
      "relative w-full h-full bg-brand-bg rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-1000",
      getScenarioOverlay()
    )}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={INITIAL_CENTER}
        zoom={9}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: theme === 'dark' ? darkMapStyle : lightMapStyle,
          disableDefaultUI: true,
          zoomControl: true,
          restriction: {
            latLngBounds: KERALA_BOUNDS,
            strictBounds: false,
          },
          minZoom: 7,
          maxZoom: 15,
        }}
      >
        {layers.traffic && <TrafficLayer />}
        {/* Town Markers */}
        {KERALA_LOCATIONS.map((town) => {
          const coord = LOCATION_COORDS[town];
          if (!coord) return null;

          const isStart = town === source;
          const isEnd = town === destination;
          const isSelected = isStart || isEnd;

          return (
            <Marker
              key={town}
              position={{ lat: coord.lat, lng: coord.lng }}
              onClick={() => setActiveMarker(town)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: isStart ? "#10B981" : isEnd ? "#2563EB" : "#94a3b8",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#FFFFFF",
                scale: isSelected ? 8 : 5,
              }}
              label={isSelected ? {
                text: town,
                color: "#FFFFFF",
                fontSize: "10px",
                fontWeight: "bold",
                className: "mt-8"
              } : undefined}
            />
          );
        })}

        {/* Route Polylines (Segments) */}
        {selectedRoute && selectedRoute.segments && selectedRoute.segments.length > 0 ? (
          selectedRoute.segments.map((segment, idx) => (
            <Polyline
              key={`${selectedRoute.id}-segment-${idx}`}
              path={segment.coordinates.map(c => ({ lat: c[0], lng: c[1] }))}
              options={{
                strokeColor: segment.traffic === 'high' ? '#f43f5e' : 
                            segment.traffic === 'medium' ? '#F59E0B' : '#10B981',
                strokeOpacity: 1,
                strokeWeight: 6,
                geodesic: true,
              }}
            />
          ))
        ) : animatedCoords.length > 0 && (
          <Polyline
            path={animatedCoords}
            options={{
              strokeColor: scenario === 'emergency' ? '#f43f5e' : 
                          scenario === 'rain' ? '#2563EB' :
                          scenario === 'heavy-traffic' ? '#F59E0B' : '#2563EB',
              strokeOpacity: 1,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}

        {/* Hovered Route Polyline */}
        {hoveredRouteId && hoveredRouteId !== selectedRouteId && (
          <Polyline
            path={routes.find(r => r.id === hoveredRouteId)?.coordinates.map(c => ({ lat: c[0], lng: c[1] }))}
            options={{
              strokeColor: '#FFFFFF',
              strokeOpacity: 0.3,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}

        {activeMarker && (
          <InfoWindow
            position={{ 
              lat: LOCATION_COORDS[activeMarker].lat, 
              lng: LOCATION_COORDS[activeMarker].lng 
            }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-2 text-brand-bg">
              <h3 className="font-bold">{activeMarker}</h3>
              <p className="text-[10px] opacity-70 uppercase tracking-widest">Kerala Hub</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* UI Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-30 pointer-events-none">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] text-white border-white/10"
        >
          <div className={cn(
            "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]",
            scenario === 'normal' ? 'bg-brand-secondary' : 
            scenario === 'rain' ? 'bg-brand-primary' :
            scenario === 'emergency' ? 'bg-rose-500' : 'bg-brand-highlight'
          )} />
          {scenario.toUpperCase()} MODE ACTIVE
        </motion.div>

        {layers.traffic && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 text-[9px] font-bold text-brand-text-muted border-white/10"
          >
            <Activity size={12} className="text-brand-secondary animate-pulse" />
            LIVE TRAFFIC FEED ACTIVE
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-6 left-6 z-30 flex flex-col gap-2 p-4 bg-brand-bg/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-none">
        <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Traffic Density</div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#10B981]" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Low</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Medium</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">High</span>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 glass-card px-4 py-2 rounded-2xl text-[9px] font-bold uppercase tracking-[0.3em] text-brand-text-muted border-white/5 z-30">
        Google Intelligence Layer <span className="text-brand-secondary ml-1">v5.0</span>
      </div>
    </div>
  );
};
