"use client";

interface MethodBadgeProps {
  method: string;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-orange-100 text-orange-800",
  PATCH: "bg-yellow-100 text-yellow-800",
  DELETE: "bg-red-100 text-red-800",
  NONE: "bg-gray-100 text-gray-700",
};

export default function MethodBadge({ method, className = "" }: MethodBadgeProps) {
  const activeColor = COLOR_MAP[method] || "bg-gray-100 text-gray-700";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${activeColor} ${className}`}>
      {method}
    </span>
  );
}
