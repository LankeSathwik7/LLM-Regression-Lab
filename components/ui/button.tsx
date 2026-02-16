"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-slate-800 focus-visible:ring-slate-700",
        outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400",
        accent: "bg-ember text-white hover:bg-orange-600 focus-visible:ring-orange-500",
        ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300",
        danger: "bg-maroon text-white hover:bg-red-800 focus-visible:ring-red-700"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-11 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
