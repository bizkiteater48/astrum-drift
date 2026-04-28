import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,box-shadow,filter,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
" hover-elevate active-elevate-2 hover:brightness-110 hover:-translate-y-px hover:scale-[1.01] active:translate-y-0 active:scale-100",
  {
    variants: {
      variant: {
        default:
           "bg-primary text-primary-foreground border border-primary-border shadow-[0_0_0_0_hsl(var(--primary)/0)] hover:shadow-[0_0_18px_2px_hsl(var(--primary)/0.55),0_0_36px_4px_hsl(var(--primary)/0.25)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border hover:shadow-[0_0_18px_2px_hsl(var(--destructive)/0.5)]",
        outline:
          " border [border-color:var(--button-outline)] shadow-xs active:shadow-none",
        secondary:
          "border bg-secondary text-secondary-foreground border border-secondary-border hover:shadow-[0_0_16px_1px_hsl(var(--primary)/0.35)]",
        ghost: "border border-transparent hover:[border-color:hsl(var(--primary)/0.35)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-5 py-2",
        sm: "min-h-8 rounded-full px-4 text-xs",
        lg: "min-h-10 rounded-full px-8",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
