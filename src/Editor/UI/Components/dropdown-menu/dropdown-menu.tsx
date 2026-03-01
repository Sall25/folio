import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { cn } from "../utils"
import "./dropdown-menu.scss"
import { useAnimationFrame } from "../hooks/use-animation-frame"

/* Root */

function DropdownMenu(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>
) {
  return <DropdownMenuPrimitive.Root modal={false} {...props} />
}

/* Trigger */

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>
) {
  return <DropdownMenuPrimitive.Trigger {...props} />
}

/* Content */

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "start",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const { open } = useAnimationFrame()

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        data-state={open ? 'open' : 'closed'}
        className={cn("tiptap-dropdown", className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

/* Item */

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn("tiptap-dropdown-item", className)}
      {...props}
    />
  )
}

/* Sub (for `Colors >` etc.) */

function DropdownMenuSub(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>
) {
  return <DropdownMenuPrimitive.Sub {...props} />
}

function DropdownMenuSubTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn("tiptap-dropdown-subtrigger", className)}
      {...props}
    />
  )
}

function DropdownMenuSubContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        sideOffset={sideOffset}
        className={cn("tiptap-dropdown", className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

/* Separator */

function DropdownMenuSeparator(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>
) {
  return <DropdownMenuPrimitive.Separator {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
}