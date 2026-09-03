"use client";

import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncidentPhotoModalProps {
  imageUrl: string | null;
  incidentId: string;
  onClose: () => void;
}

export default function IncidentPhotoModal({
  imageUrl,
  incidentId,
  onClose
}: IncidentPhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!imageUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Incident Photo</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 font-medium">No photo available</p>
              <p className="text-slate-600 text-sm">Incident {incidentId}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden max-w-4xl max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-white">Incident Photo</h3>
            <p className="text-sm text-slate-400">Incident {incidentId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image */}
        <div className="relative">
          {!imageLoaded && !imageError && (
            <div className="flex items-center justify-center h-64 bg-slate-800">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
          
          {imageError ? (
            <div className="flex flex-col items-center gap-4 py-16 px-8 bg-slate-800">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-red-400 font-medium">Failed to load image</p>
                <p className="text-slate-500 text-sm">The incident photo could not be displayed</p>
              </div>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={`Incident ${incidentId} photo`}
              className={cn(
                "max-w-full max-h-[70vh] object-contain bg-slate-950",
                !imageLoaded && "hidden"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}