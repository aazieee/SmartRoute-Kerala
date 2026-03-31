import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Shield, 
  Zap, 
  TrafficCone, 
  Loader2,
  X,
  Sparkles,
  AlertCircle,
  CloudRain,
  Moon,
  Sun,
  ChevronDown,
  Cloud,
  Menu,
  Settings,
  Layers,
  Home,
  Activity,
  MessageSquare,
  ChevronRight,
  Bell,
  User,
  AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Map } from './components/Map';
import { RouteCard } from './components/RouteCard';
import { Chat } from './components/Chat';
import { Route, ScenarioMode, LiveConditions, MapLayers, AppSection } from './types';
import { getRouteExplanation } from './services/ai';
import { cn } from './lib/utils';
import { KERALA_LOCATIONS, SCENARIOS, LOCATION_COORDS } from './constants';

const formatTime = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs} hr ${mins > 0 ? `${mins} min` : ''}`.trim();
};

const getTrafficLevel = (base: number, scenario: ScenarioMode): 'low' | 'medium' | 'high' => {
  let score = base;
  if (scenario === 'heavy-traffic') score += 40;
  if (scenario === 'rain') score += 20;
  if (score > 70) return 'high';
  if (score > 30) return 'medium';
  return 'low';
};

const getRiskLevel = (base: number, scenario: ScenarioMode): 'low' | 'medium' | 'high' => {
  let score = base;
  if (scenario === 'rain') score += 30;
  if (scenario === 'emergency') score += 50;
  if (score > 70) return 'high';
  if (score > 40) return 'medium';
  return 'low';
};

const fetchDynamicRoutes = async (source: string, destination: string, scenario: ScenarioMode): Promise<Route[]> => {
  const start = LOCATION_COORDS[source];
  const end = LOCATION_COORDS[destination];
  
  if (!start || !end) return [];

  const routeTypes: ('fastest' | 'least-traffic' | 'safest')[] = ['fastest', 'least-traffic', 'safest'];
  
  const results = await Promise.all(routeTypes.map(async (type) => {
    let traffic: 'low' | 'medium' | 'high' = 'low';
    let risk: 'low' | 'medium' | 'high' = 'low';
    let color = '#38bdf8';
    let name = '';
    let alerts: string[] = [];
    let coordinates: [number, number][] = [];
    let distance = 0;
    let duration = 0;

    // Use OSRM for real road-based routing
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes.length > 0) {
        const osrmRoute = data.routes[0];
        coordinates = osrmRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]); // [lat, lng]
        distance = osrmRoute.distance / 1000; // km
        duration = osrmRoute.duration / 60; // min

        // Generate segments for traffic visualization
        const segmentCount = Math.min(10, Math.floor(coordinates.length / 5));
        if (segmentCount > 1) {
          const segments: any[] = [];
          const pointsPerSegment = Math.floor(coordinates.length / segmentCount);
          
          for (let i = 0; i < segmentCount; i++) {
            const startIdx = i * pointsPerSegment;
            const endIdx = (i === segmentCount - 1) ? coordinates.length : (i + 1) * pointsPerSegment + 1;
            
            // Random traffic for simulation
            const rand = Math.random();
            let segTraffic: 'low' | 'medium' | 'high' = 'low';
            if (scenario === 'heavy-traffic') {
              segTraffic = rand > 0.3 ? 'high' : 'medium';
            } else if (scenario === 'rain') {
              segTraffic = rand > 0.5 ? 'high' : 'medium';
            } else {
              segTraffic = rand > 0.8 ? 'high' : rand > 0.5 ? 'medium' : 'low';
            }

            segments.push({
              coordinates: coordinates.slice(startIdx, endIdx),
              traffic: segTraffic
            });
          }
          return {
            id: type,
            name,
            type,
            time: formatTime(duration),
            distance: `${distance.toFixed(1)} km`,
            traffic,
            predictedTraffic: getTrafficLevel(Math.random() * 100, scenario),
            riskLevel: risk,
            safetyScore: type === 'safest' ? 10 : type === 'least-traffic' ? 9 : 7,
            color,
            path: '',
            coordinates,
            segments,
            alerts
          };
        }
      }
    } catch (error) {
      console.error("Routing Error:", error);
      coordinates = [[start.lat, start.lng], [end.lat, end.lng]];
    }

    if (type === 'fastest') {
      name = 'NH-66 Malabar Express';
      traffic = getTrafficLevel(30, scenario);
      risk = getRiskLevel(20, scenario);
      color = '#2563EB';
      alerts = scenario === 'rain' ? ['Hydroplaning Risk'] : ['High Speed Zone'];
    } else if (type === 'least-traffic') {
      name = 'Coastal Bypass (SH-62)';
      traffic = getTrafficLevel(10, scenario);
      risk = getRiskLevel(15, scenario);
      color = '#F59E0B';
      alerts = ['Low Traffic', 'Narrow Roads'];
      // Simulate a slightly longer route for variety if it's the same OSRM result
      duration *= 1.2;
      distance *= 1.1;
    } else {
      name = 'Inland Hill Highway';
      traffic = getTrafficLevel(40, scenario);
      risk = getRiskLevel(5, scenario);
      color = '#10B981';
      alerts = ['Well Lit', 'Police Presence', 'Hospital Access'];
      duration *= 1.1;
    }

    return {
      id: type,
      name,
      type,
      time: formatTime(duration),
      distance: `${distance.toFixed(1)} km`,
      traffic,
      predictedTraffic: getTrafficLevel(Math.random() * 100, scenario),
      riskLevel: risk,
      safetyScore: type === 'safest' ? 10 : type === 'least-traffic' ? 9 : 7,
      color,
      path: '', // Not used anymore by Leaflet
      coordinates,
      alerts
    };
  }));

  return results;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-8">
          <div className="glass-card p-8 rounded-[2.5rem] max-w-md text-center space-y-6 border-rose-500/20">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
              <AlertCircle className="text-rose-500" size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">System Interrupted</h2>
              <p className="text-brand-text-muted mt-2 text-sm">The SmartRoute Kerala intelligence core encountered an unexpected error. Please refresh the dashboard.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20"
            >
              Restart System
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [source, setSource] = useState('Kozhikode');
  const [destination, setDestination] = useState('Malappuram');
  const [scenario, setScenario] = useState<ScenarioMode>('normal');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ routeId: string; text: string } | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [layers, setLayers] = useState<MapLayers>({
    traffic: true,
    safety: true
  });
  const [units, setUnits] = useState<'km' | 'miles'>('km');

  useEffect(() => {
    handleSearch();
  }, [scenario]);

  const liveConditions: LiveConditions = useMemo(() => {
    switch (scenario) {
      case 'rain': return { weather: 'Heavy Monsoon (Edavappathi)', trafficDensity: 65, roadRisk: 'high' };
      case 'heavy-traffic': return { weather: 'Clear Sky', trafficDensity: 92, roadRisk: 'moderate' };
      case 'emergency': return { weather: 'State Alert Status', trafficDensity: 20, roadRisk: 'critical' };
      default: return { weather: 'Sunny (Normal)', trafficDensity: 40, roadRisk: 'low' };
    }
  }, [scenario]);

  const handleSearch = async (newSource?: string, newDest?: string) => {
    const s = newSource || source;
    const d = newDest || destination;
    if (!s || !d) return;
    
    setIsSearching(true);
    setRoutes([]);
    setSelectedRouteId(null);
    setExplanation(null);

    try {
      const generated = await fetchDynamicRoutes(s, d, scenario);
      setRoutes(generated);
      if (generated.length > 0) {
        setSelectedRouteId(generated[0].id);
      }
    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExplain = async (route: Route) => {
    setIsExplaining(true);
    const text = await getRouteExplanation(route, source, destination, scenario);
    setExplanation({ routeId: route.id, text });
    setIsExplaining(false);
  };

  const bestRoute = useMemo(() => {
    if (routes.length === 0) return null;
    
    // Intelligent weighted scoring
    // Emergency Mode: Speed (80%), Traffic (20%)
    // Normal Mode: Safety (50%), Traffic (30%), Time (20%)
    const getScore = (r: Route) => {
      const safety = r.safetyScore;
      const traffic = r.traffic === 'low' ? 10 : r.traffic === 'medium' ? 6 : 2;
      const time = parseInt(r.time) || 0;
      const timeScore = Math.max(0, 10 - (time / 6)); 
      
      if (isEmergencyMode) {
        return (timeScore * 0.8) + (traffic * 0.2);
      }
      
      return (safety * 0.5) + (traffic * 0.3) + (timeScore * 0.2);
    };

    return routes.reduce((prev, curr) => (getScore(curr) > getScore(prev) ? curr : prev));
  }, [routes, isEmergencyMode]);

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
                <p className="text-brand-text-muted text-sm">Kerala Network Overview</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Home size={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="glass-card p-6 rounded-3xl space-y-2 min-h-[140px] flex flex-col justify-center">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Routes Analyzed</span>
                <div className="text-3xl font-black text-white">1,284</div>
                <div className="text-[10px] text-brand-secondary font-bold flex items-center gap-1">
                  <Zap size={10} /> +12% from yesterday
                </div>
              </div>
              <div className="glass-card p-6 rounded-3xl space-y-2 min-h-[140px] flex flex-col justify-center">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Traffic Status</span>
                <div className="text-3xl font-black text-brand-highlight uppercase break-words">Moderate</div>
                <div className="text-[10px] text-brand-text-muted font-bold">Peak hours approaching</div>
              </div>
              <div className="glass-card p-6 rounded-3xl space-y-2 min-h-[140px] flex flex-col justify-center">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Active Scenario</span>
                <div className="text-3xl font-black text-brand-primary uppercase break-words">{scenario}</div>
                <div className="text-[10px] text-brand-text-muted font-bold">System optimized</div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest px-2">Quick Actions</h3>
              <button 
                onClick={() => setActiveSection('planner')}
                className="w-full p-6 rounded-3xl bg-brand-primary text-white flex items-center justify-between group active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Navigation size={24} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-lg">Start Route</span>
                    <span className="text-xs text-white/70">Plan your next journey</span>
                  </div>
                </div>
                <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        );
      case 'planner':
        return (
          <div className="space-y-6 h-full flex flex-col">
            <div className="shrink-0 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Route Planner</h2>
                  <p className="text-brand-text-muted text-sm">Optimize your journey</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-bold text-brand-primary uppercase tracking-widest">
                  <Activity size={12} />
                  AI Optimized
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="relative group">
                  <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" />
                  <select 
                    value={source}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSource(val);
                      handleSearch(val, destination);
                    }}
                    className="w-full bg-brand-card border border-brand-border focus:border-brand-primary/50 rounded-2xl py-4 pl-11 pr-4 text-sm text-white appearance-none transition-all outline-none"
                  >
                    {KERALA_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div className="relative group">
                  <Navigation size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary rotate-90" />
                  <select 
                    value={destination}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDestination(val);
                      handleSearch(source, val);
                    }}
                    className="w-full bg-brand-card border border-brand-border focus:border-brand-primary/50 rounded-2xl py-4 pl-11 pr-4 text-sm text-white appearance-none transition-all outline-none"
                  >
                    {KERALA_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>

              <button 
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="w-full py-4 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                {isSearching ? 'Optimizing...' : 'Optimize Routes'}
              </button>
            </div>

            <div className="flex-1 min-h-[300px] rounded-3xl overflow-hidden border border-brand-border relative">
              <Map 
                routes={routes}
                selectedRouteId={selectedRouteId}
                hoveredRouteId={hoveredRouteId}
                onSelectRoute={setSelectedRouteId}
                layers={layers}
                scenario={scenario}
                source={source}
                destination={destination}
                theme={theme}
              />
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button 
                  onClick={() => handleSearch()}
                  className="p-3 rounded-xl bg-brand-bg/80 backdrop-blur-xl border border-white/10 text-white"
                >
                  <Zap size={18} />
                </button>
              </div>
            </div>

            <div className="shrink-0 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Optimized Paths</h2>
                <span className="text-[9px] font-bold text-brand-secondary bg-brand-secondary/10 px-3 py-1 rounded-full border border-brand-secondary/20">LIVE</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                {routes.map((route) => (
                  <div key={route.id} className="snap-center shrink-0 w-[280px]">
                    <RouteCard
                      route={route}
                      isSelected={selectedRouteId === route.id}
                      isRecommended={bestRoute?.id === route.id}
                      onSelect={() => setSelectedRouteId(route.id)}
                      onHover={() => setHoveredRouteId(route.id)}
                      onLeave={() => setHoveredRouteId(null)}
                      onExplain={() => handleExplain(route)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'live':
        return (
          <div className="space-y-8 flex flex-col h-full">
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-8 rounded-[2rem] border-white/5 space-y-8"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-secondary/10 flex items-center justify-center">
                  <Activity className="text-brand-secondary" size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-white tracking-tight">Live Conditions</h2>
                  <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Real-time Kerala Network Status</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-text-muted">Weather Status</span>
                    <span className="text-xs font-bold text-white">{liveConditions.weather}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: scenario === 'rain' ? '85%' : '20%' }}
                      className={cn("h-full", scenario === 'rain' ? 'bg-brand-primary' : 'bg-brand-highlight')}
                    />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-text-muted">Network Congestion</span>
                    <span className="text-xs font-bold text-white">{liveConditions.trafficDensity}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${liveConditions.trafficDensity}%` }}
                      className={cn("h-full", liveConditions.trafficDensity > 70 ? 'bg-rose-500' : 'bg-brand-primary')}
                    />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-text-muted">Road Risk Level</span>
                    <span className={cn(
                      "text-xs font-bold px-3 py-1 rounded-lg border",
                      liveConditions.roadRisk === 'low' ? 'text-brand-secondary border-brand-secondary/20 bg-brand-secondary/5' :
                      liveConditions.roadRisk === 'moderate' ? 'text-brand-highlight border-brand-highlight/20 bg-brand-highlight/5' :
                      'text-rose-500 border-rose-500/20 bg-rose-500/5'
                    )}>
                      {liveConditions.roadRisk.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-brand-primary/5 border border-brand-primary/10">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-brand-primary shrink-0" size={20} />
                  <p className="text-[11px] leading-relaxed text-brand-text-muted">
                    <span className="text-white font-bold block mb-1">System Advisory</span>
                    {scenario === 'rain' 
                      ? "Heavy monsoon detected. Coastal routes experiencing 30% slower traffic." 
                      : scenario === 'emergency'
                      ? "Emergency protocols active. Priority routes cleared for rapid transit."
                      : "Normal operations. Expect standard peak hour congestion in urban hubs."}
                  </p>
                </div>
              </div>
            </motion.section>
          </div>
        );
      case 'layers':
        return (
          <div className="space-y-8 flex flex-col h-full">
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-8 rounded-[2rem] border-white/5 space-y-8"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  <Layers className="text-brand-primary" size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-white tracking-tight">Map Layers</h2>
                  <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Customize Visualization</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'traffic', label: 'Live Traffic Layer', icon: TrafficCone },
                  { id: 'safety', label: 'Safety Markers', icon: Shield },
                ].map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => setLayers(prev => ({ ...prev, [layer.id]: !prev[layer.id as keyof MapLayers] }))}
                    className={cn(
                      "w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300",
                      layers[layer.id as keyof MapLayers] 
                        ? "bg-brand-primary/10 border-brand-primary/20 text-white shadow-lg shadow-brand-primary/5" 
                        : "bg-white/5 border-white/5 text-brand-text-muted hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <layer.icon size={20} className={layers[layer.id as keyof MapLayers] ? "text-brand-primary" : "text-brand-text-muted"} />
                      <span className="text-sm font-bold">{layer.label}</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors duration-300",
                      layers[layer.id as keyof MapLayers] ? "bg-brand-primary" : "bg-white/10"
                    )}>
                      <motion.div 
                        animate={{ x: layers[layer.id as keyof MapLayers] ? 22 : 2 }}
                        className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>
          </div>
        );
      case 'ai':
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 glass-card rounded-3xl border-brand-border overflow-hidden flex flex-col">
              <Chat 
                routes={routes} 
                source={source} 
                destination={destination} 
                scenario={scenario}
                onSetScenario={setScenario}
                onSelectRoute={setSelectedRouteId}
                onUpdateDestination={(s, d) => {
                  if (s) setSource(s);
                  if (d) setDestination(d);
                  if (s || d) handleSearch(s, d);
                }}
                inline={true}
              />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
                <p className="text-brand-text-muted text-sm">System Configuration</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Settings size={20} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest px-2">Appearance</h3>
                <div className="glass-card p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors",
                        theme === 'dark' ? "bg-brand-primary/10 text-brand-primary" : "bg-white/5 text-brand-text-muted"
                      )}>
                        <Moon size={20} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-brand-text block">Dark Mode</span>
                        <span className="text-[10px] text-brand-text-muted uppercase tracking-wider">Reduce eye strain</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-colors duration-300",
                        theme === 'dark' ? "bg-brand-primary" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: theme === 'dark' ? 26 : 2 }}
                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest px-2">Map Settings</h3>
                <div className="glass-card p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors",
                        layers.traffic ? "bg-brand-highlight/10 text-brand-highlight" : "bg-white/5 text-brand-text-muted"
                      )}>
                        <TrafficCone size={20} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-brand-text block">Traffic Layer</span>
                        <span className="text-[10px] text-brand-text-muted uppercase tracking-wider">Real-time traffic feed</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setLayers(prev => ({ ...prev, traffic: !prev.traffic }))}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-colors duration-300",
                        layers.traffic ? "bg-brand-primary" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: layers.traffic ? 26 : 2 }}
                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-brand-border">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary">
                        <Navigation size={20} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-brand-text block">Distance Units</span>
                        <span className="text-[10px] text-brand-text-muted uppercase tracking-wider">KM or Miles</span>
                      </div>
                    </div>
                    <div className="flex p-1 bg-white/5 rounded-lg border border-brand-border">
                      <button 
                        onClick={() => setUnits('km')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                          units === 'km' ? "bg-brand-primary text-white shadow-sm" : "text-brand-text-muted hover:text-white"
                        )}
                      >
                        KM
                      </button>
                      <button 
                        onClick={() => setUnits('miles')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                          units === 'miles' ? "bg-brand-primary text-white shadow-sm" : "text-brand-text-muted hover:text-white"
                        )}
                      >
                        MI
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest px-2">Scenario Simulation</h3>
                <div className="glass-card p-6 rounded-3xl grid grid-cols-2 gap-3">
                  {(['normal', 'heavy-traffic', 'rain', 'emergency'] as ScenarioMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setScenario(mode)}
                      className={cn(
                        "px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                        scenario === mode 
                          ? "bg-brand-primary/10 border-brand-primary/40 text-brand-primary" 
                          : "bg-white/5 border-brand-border text-brand-text-muted hover:text-white"
                      )}
                    >
                      {mode.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen bg-black flex items-center justify-center font-sans selection:bg-brand-primary/30", theme)}>
      <div className="mobile-container">
        {/* Top Header */}
        <header className="shrink-0 px-6 py-4 flex items-center justify-between bg-brand-bg/80 backdrop-blur-xl border-b border-white/5 z-40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <Navigation className="text-white" size={18} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">SmartRoute</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg bg-white/5 text-brand-text-muted hover:text-white transition-all relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-primary rounded-full border border-brand-bg" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 safe-bottom">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderSectionContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="shrink-0 bg-brand-bg/95 backdrop-blur-2xl border-t border-white/5 px-4 py-3 flex items-center justify-around safe-bottom z-50">
          {[
            { id: 'home' as AppSection, icon: Home, label: 'Home' },
            { id: 'planner' as AppSection, icon: Navigation, label: 'Route' },
            { id: 'live' as AppSection, icon: Activity, label: 'Live' },
            { id: 'ai' as AppSection, icon: MessageSquare, label: 'AI' },
            { id: 'settings' as AppSection, icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 relative px-4 py-1",
                activeSection === item.id ? "text-brand-primary" : "text-brand-text-muted hover:text-brand-text"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-transform",
                activeSection === item.id && "scale-110"
              )} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              {activeSection === item.id && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-primary rounded-full shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                />
              )}
            </button>
          ))}
        </nav>

        {/* AI Explanation Overlay */}
        <AnimatePresence>
          {(explanation || isExplaining) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full max-w-[430px] bg-brand-card border border-white/10 rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2" />
                
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-primary/20 text-brand-primary">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">Intelligence Report</h2>
                      <p className="text-brand-text-muted text-[9px] uppercase tracking-widest">AI Analysis Active</p>
                    </div>
                  </div>
                  <button onClick={() => setExplanation(null)} className="p-2 hover:bg-white/5 rounded-full text-brand-text-muted hover:text-white transition-all">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {isExplaining ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="text-brand-primary animate-spin" size={32} />
                      <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.3em] animate-pulse">Synthesizing Data</span>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-brand-text-muted">
                      <ReactMarkdown>{explanation?.text || ''}</ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-white/5 bg-brand-bg/50 safe-bottom">
                  <button 
                    onClick={() => setExplanation(null)}
                    className="w-full py-4 rounded-2xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/80 transition-all shadow-lg shadow-brand-primary/20"
                  >
                    Acknowledge Report
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Chat Button for non-AI sections */}
      {activeSection !== 'ai' && activeSection !== 'planner' && (
        <div className="fixed bottom-24 right-6 z-40">
          <button 
            onClick={() => setActiveSection('ai')}
            className="w-14 h-14 rounded-2xl bg-brand-primary text-white shadow-2xl shadow-brand-primary/40 flex items-center justify-center active:scale-90 transition-transform"
          >
            <MessageSquare size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
