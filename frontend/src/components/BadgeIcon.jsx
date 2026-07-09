import * as LucideIcons from "lucide-react";
import React from "react";

/**
 * Render a badge icon from a Lucide icon name.
 * Fallback to Award if the name isn't found.
 */
export default function BadgeIcon({ name, className = "", strokeWidth = 1.5, size = 20 }) {
  const Cmp = LucideIcons[name] || LucideIcons.Award;
  return <Cmp className={className} strokeWidth={strokeWidth} size={size} />;
}
