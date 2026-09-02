import { type HTMLAttributes } from "react";
import { cn, getSeverityBg } from "@/lib/utils";
import type { SeverityLevel } from "@/types";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "severity";
  severity?: SeverityLevel;
  pulse?: boolean;
}

const defaultVariants: Record<string, string> = {
  default: "bg-slate-600/50 border-slate-500/50 text-slate-300",
  blue: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  green: "bg-green-500/20 border-green-500/40 text-green-300",
  red: "bg-red-500/20 border-red-500/40 text-red-300",
};

export function Badge({
  variant = "default",
  severity,
  pulse = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border uppercase";

  const colorClasses =
    variant === "severity" && severity
      ? getSeverityBg(severity)
      : defaultVariants.default;

  return (
    <span
      className={cn(baseClasses, colorClasses, pulse && "animate-pulse", className)}
      {...props}
    >
      {children}
    </span>
  );
}

interface SeverityDotProps {
  severity: SeverityLevel;
  size?: "sm" | "md";
}

export function SeverityDot({ severity, size = "md" }: SeverityDotProps) {
  const colorMap: Record<SeverityLevel, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-green-500",
  };

  return (
    <span
      className={cn(
        "rounded-full inline-block shrink-0",
        colorMap[severity],
        size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5"
      )}
      aria-hidden="true"
    />
  );
}

export default Badge;
