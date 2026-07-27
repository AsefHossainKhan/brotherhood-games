"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "blue"
  | "yellow"
  | "orange"
  | "red"
  | "purple";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-green-600 font-semibold text-white hover:bg-green-700",
  blue: "bg-blue-600 font-semibold text-white hover:bg-blue-700",
  yellow: "bg-yellow-600 font-semibold text-white hover:bg-yellow-700",
  orange: "bg-orange-600 font-semibold text-white hover:bg-orange-700",
  red: "bg-red-600 font-semibold text-white hover:bg-red-700",
  purple: "bg-purple-600 font-semibold text-white hover:bg-purple-500",
  secondary:
    "border border-white/20 bg-white/5 text-white/70 hover:bg-white/10",
  outline: "border border-white/20 text-white/70 hover:bg-black/30",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2",
  lg: "px-4 py-3",
  xl: "px-6 py-3 text-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Shared button primitive. Centralizes the app's button styling, disabled
 * states, and keyboard focus-visible ring for accessibility.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      className = "",
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={`cursor-pointer rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  },
);
