import React from 'react';
import { motion } from 'motion/react';
import { Clock, Navigation, Shield, AlertTriangle, ChevronRight, Zap, TrafficCone, Activity, BarChart3 } from 'lucide-react';
import { Route, TrafficLevel } from '../types';
import { cn } from '../lib/utils';

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  isRecommended?: boolean;
  onSelect: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  onExplain: () => void;
}

const trafficColors: Record<TrafficLevel, string> = {
  low: 'text-brand-secondary',
  medium: 'text-brand-highlight',
  high: 'text-rose-500',
};

const riskColors = {
  low: 'text-brand-secondary',
  medium: 'text-brand-highlight',
  high: 'text-rose-500',
};

const typeIcons = {
  fastest: <Zap size={16} className="text-brand-primary" />,
  'least-traffic': <TrafficCone size={16} className="text-brand-highlight" />,
  safest: <Shield size={16} className="text-brand-secondary" />,
};

export const RouteCard: React.FC<RouteCardProps> = ({ route, isSelected, isRecommended, onSelect, onHover, onLeave, onExplain }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        "glass-card p-6 rounded-[2rem] cursor-pointer transition-all duration-500 group relative overflow-hidden border-2",
        isSelected 
          ? "border-brand-primary/60 bg-brand-primary/10 ring-4 ring-brand-primary/10 shadow-[0_20px_50px_rgba(37,99,235,0.2)] scale-[1.02] z-10" 
          : "hover:bg-brand-primary/5 border-brand-border hover:border-brand-primary/30 shadow-xl",
        isRecommended && !isSelected && "border-brand-secondary/30"
      )}
    >
      {/* Background Glow for Selected */}
      {isSelected && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/20 blur-[80px] rounded-full pointer-events-none" />
      )}

      {/* Recommended Indicator */}
      {isRecommended && (
        <div className="absolute top-4 right-6">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-secondary/20 border border-brand-secondary/30 text-[9px] font-black text-brand-secondary uppercase tracking-[0.15em] shadow-sm">
            <Zap size={10} fill="currentColor" />
            AI Recommended
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-brand-text group-hover:text-brand-primary transition-colors tracking-tight">
            {route.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "text-[9px] uppercase tracking-[0.2em] font-black px-2.5 py-1 rounded-lg border",
              route.type === 'fastest' ? "bg-brand-primary/10 text-brand-primary border-brand-primary/30" :
              route.type === 'safest' ? "bg-brand-secondary/10 text-brand-secondary border-brand-secondary/30" :
              "bg-brand-highlight/10 text-brand-highlight border-brand-highlight/30"
            )}>
              {route.type.replace('-', ' ')}
            </span>
            {route.traffic === 'low' && (
              <span className="text-[9px] uppercase tracking-[0.2em] font-black px-2.5 py-1 rounded-lg border bg-brand-secondary/10 text-brand-secondary border-brand-secondary/30">
                LOW TRAFFIC
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-brand-text tracking-tighter leading-none">{route.time}</div>
          <div className="text-[10px] text-brand-text-muted font-bold uppercase tracking-[0.2em] mt-1.5 opacity-80">{route.distance}</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3.5 rounded-2xl bg-brand-bg/50 border border-brand-border space-y-1.5 group-hover:bg-brand-bg transition-colors">
          <div className="flex items-center gap-2 text-brand-text-muted">
            <TrafficCone size={12} className="opacity-60" />
            <span className="text-[9px] uppercase tracking-[0.15em] font-black">Traffic</span>
          </div>
          <div className={cn("text-xs font-black tracking-tight", trafficColors[route.traffic])}>
            {route.traffic.toUpperCase()}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-brand-bg/50 border border-brand-border space-y-1.5 group-hover:bg-brand-bg transition-colors">
          <div className="flex items-center gap-2 text-brand-text-muted">
            <BarChart3 size={12} className="opacity-60" />
            <span className="text-[9px] uppercase tracking-[0.15em] font-black">Predicted</span>
          </div>
          <div className={cn("text-xs font-black tracking-tight", trafficColors[route.predictedTraffic])}>
            {route.predictedTraffic.toUpperCase()}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-brand-bg/50 border border-brand-border space-y-1.5 group-hover:bg-brand-bg transition-colors">
          <div className="flex items-center gap-2 text-brand-text-muted">
            <Activity size={12} className="opacity-60" />
            <span className="text-[9px] uppercase tracking-[0.15em] font-black">Risk Level</span>
          </div>
          <div className={cn("text-xs font-black tracking-tight", riskColors[route.riskLevel])}>
            {route.riskLevel.toUpperCase()}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-brand-bg/50 border border-brand-border space-y-1.5 group-hover:bg-brand-bg transition-colors">
          <div className="flex items-center gap-2 text-brand-text-muted">
            <Shield size={12} className="opacity-60" />
            <span className="text-[9px] uppercase tracking-[0.15em] font-black">Safety</span>
          </div>
          <div className="text-xs font-black text-brand-text tracking-tight">{route.safetyScore}/10 Score</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExplain();
          }}
          className="flex-1 py-3.5 rounded-xl bg-brand-primary/5 hover:bg-brand-primary hover:text-white border border-brand-primary/20 hover:border-brand-primary text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-brand-primary/30"
        >
          Intelligence Report
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Alert Badges */}
      {route.alerts && route.alerts.length > 0 && isSelected && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 flex flex-wrap gap-3 pt-6 border-t border-white/10"
        >
          {route.alerts.map((alert, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-400 uppercase tracking-widest shadow-sm">
              <AlertTriangle size={12} />
              {alert}
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
