"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Clock } from "lucide-react";
import { Realtime } from "ably";
import type { Message } from "ably";
import type { DroneLocationUpdate } from "@/types";
import { getCurrentDroneLocation, isDroneLocationRecent, updateDroneLocation } from "@/lib/droneLocation";
import { formatCoordinates } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DRONE_CHANNEL, EVENT_LOCATION } from "@/lib/ablyConfig";

interface DroneLocationWidgetProps {
  className?: string;
}

export default function DroneLocationWidget({ className }: DroneLocationWidgetProps) {
  const [location, setLocation] = useState<DroneLocationUpdate | null>(null);
  const [isRecent, setIsRecent] = useState(false);
  const ablyRef = useRef<Realtime | null>(null);

  useEffect(() => {
    // Load initial location from storage
    const updateLocation = () => {
      const currentLocation = getCurrentDroneLocation();
      const locationRecent = isDroneLocationRecent();
      
      setLocation(currentLocation);
      setIsRecent(locationRecent);
    };

    updateLocation();
    
    // Subscribe to Ably location updates in real-time
    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) {
      console.error("[DroneLocationWidget] NEXT_PUBLIC_ABLY_KEY is not set");
      return;
    }

    const ably = new Realtime({ key, autoConnect: true });
    ablyRef.current = ably;

    ably.connection.on("connected", () => {
      console.log("[DroneLocationWidget] Ably connected");
      const ch = ably.channels.get(DRONE_CHANNEL);
      
      // Listen for location updates from drone
      const locationHandler = (msg: Message) => {
        const payload = msg.data as { latitude?: number; longitude?: number; timestamp?: string };
        if (payload.latitude !== undefined && payload.longitude !== undefined) {
          const locUpdate: DroneLocationUpdate = {
            latitude: payload.latitude,
            longitude: payload.longitude,
            timestamp: payload.timestamp || new Date().toISOString()
          };
          // Update storage and state
          updateDroneLocation(locUpdate);
          setLocation(locUpdate);
          setIsRecent(true);
          
          // Mark as stale after 30 seconds
          const timer = setTimeout(() => {
            const stored = getCurrentDroneLocation();
            if (stored?.timestamp === locUpdate.timestamp) {
              setIsRecent(isDroneLocationRecent());
            }
          }, 30000);
          
          return () => clearTimeout(timer);
        }
      };
      
      ch.subscribe(EVENT_LOCATION, locationHandler);
    });

    // Fallback: poll storage every 5 seconds for updates
    const interval = setInterval(updateLocation, 5000);
    
    return () => {
      clearInterval(interval);
      if (ablyRef.current) {
        ablyRef.current.close();
      }
    };
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const locationTime = new Date(timestamp).getTime();
    const ageMs = now - locationTime;
    const ageMinutes = Math.floor(ageMs / 60000);
    
    if (ageMinutes < 1) return "Just now";
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours}h ago`;
  };

  return (
    <div className={cn(
      "rounded-xl border p-4",
      isRecent
        ? "bg-green-500/10 border-green-500/30"
        : location
          ? "bg-yellow-500/10 border-yellow-500/30"
          : "bg-slate-800/50 border-slate-700/50",
      className
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          isRecent
            ? "bg-green-500/20 text-green-400"
            : location
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-slate-700/50 text-slate-500"
        )}>
          <Navigation className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200">Drone Location</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRecent
                ? "bg-green-400 animate-pulse"
                : location
                  ? "bg-yellow-400"
                  : "bg-slate-500"
            )} />
            <span className="text-xs text-slate-400">
              {isRecent ? "Online" : location ? "Last known" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {location ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="font-mono text-slate-300">
              {formatCoordinates(location.latitude, location.longitude)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>Last update: {formatTimeAgo(location.timestamp)}</span>
          </div>
          
          {/* Simple text-based map placeholder */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">GPS Coordinates</div>
            <div className="text-xs font-mono text-slate-300">
              Lat: {location.latitude.toFixed(6)}°<br />
              Lng: {location.longitude.toFixed(6)}°
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-2">
            <MapPin className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">No location data available</p>
          <p className="text-xs text-slate-500 mt-1">
            Drone location will appear when GPS is enabled
          </p>
        </div>
      )}
    </div>
  );
}