"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

const MenuRoot = MenuPrimitive.Root
const MenuTrigger = MenuPrimitive.Trigger

function MenuContent({
  className,
  children,
  side = "bottom",
  align = "end",
  sideOffset = 4,
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: MenuPrimitive.Positioner.Props["side"]
  align?: MenuPrimitive.Positioner.Props["align"]
  sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"]
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          className={cn(
            "min-w-[160px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:duration-100",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:duration-75",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function MenuItem({
  className,
  children,
  ...props
}: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex w-full cursor-default items-center gap-2 px-3 py-2 text-sm text-slate-700 outline-none select-none",
        "data-highlighted:bg-slate-50 data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.Item>
  )
}

function MenuDestructiveItem({
  className,
  children,
  ...props
}: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex w-full cursor-default items-center gap-2 px-3 py-2 text-sm text-red-600 outline-none select-none",
        "data-highlighted:bg-red-50 data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.Item>
  )
}

function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cn("my-1 h-px bg-slate-100", className)}
      {...props}
    />
  )
}

export {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuDestructiveItem,
  MenuSeparator,
}
