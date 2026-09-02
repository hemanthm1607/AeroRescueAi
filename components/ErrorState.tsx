import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ImageOff } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ErrorType = "api" | "network" | "invalid_response" | "no_image" | "generic";

interface ErrorStateProps {
  type?: ErrorType;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

const errorConfig: Record<
  ErrorType,
  { icon: React.ReactNode; title: string; description: string }
> = {
  api: {
    icon: <ServerCrash className="w-7 h-7 text-red-400" />,
    title: "AI Service Unavailable",
    description:
      "The AI analysis service returned an error. Check your API key configuration and try again.",
  },
  network: {
    icon: <WifiOff className="w-7 h-7 text-orange-400" />,
    title: "Connection Failed",
    description:
      "Could not reach the analysis server. Check your internet connection and try again.",
  },
  invalid_response: {
    icon: <AlertTriangle className="w-7 h-7 text-yellow-400" />,
    title: "Analysis Incomplete",
    description:
      "The AI returned an unexpected response. This may be a temporary issue — please retry.",
  },
  no_image: {
    icon: <ImageOff className="w-7 h-7 text-slate-400" />,
    title: "No Image Provided",
    description:
      "Please upload a flood image or capture a drone frame before running analysis.",
  },
  generic: {
    icon: <AlertTriangle className="w-7 h-7 text-red-400" />,
    title: "Something Went Wrong",
    description:
      "An unexpected error occurred. Please try again or refresh the page if the issue persists.",
  },
};

export default function ErrorState({
  type = "generic",
  message,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  const config = errorConfig[type];

  if (compact) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-900/20 border border-red-700/40">
        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-300">{config.title}</p>
          <p className="text-xs text-red-400/80 mt-0.5 leading-relaxed">
            {message ?? config.description}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 p-1 rounded text-red-400 hover:text-red-200 hover:bg-red-900/40 transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-10 px-6 text-center">
      {/* Icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-900/20 border-2 border-red-700/40 shadow-lg shadow-red-950/30">
        {config.icon}
      </div>

      {/* Text */}
      <div className="max-w-sm">
        <h3 className="text-base font-bold text-slate-100">{config.title}</h3>
        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
          {message ?? config.description}
        </p>
      </div>

      {/* Technical detail if provided separately */}
      {message && message !== config.description && (
        <div className="w-full max-w-sm px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg">
          <p className="text-xs font-mono text-slate-400 break-words">{message}</p>
        </div>
      )}

      {/* Retry button */}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
