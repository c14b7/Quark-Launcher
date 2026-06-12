// @/hooks/side_banner.tsx
import * as React from "react";
import { cn } from "@/lib/utils"; // Zakładam, że masz shadcn/utils do łączenia klas

// 1. Główny Item (wrapper)
export const Item = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center", className)} {...props} />
  )
);
Item.displayName = "Item";

// 2. ItemMedia (na avatar / zdjęcie)
export const ItemMedia = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-shrink-0", className)} {...props} />
  )
);
ItemMedia.displayName = "ItemMedia";

// 3. ItemContent (kontener na tytuł i opis)
export const ItemContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col flex-1 min-w-0", className)} {...props} />
  )
);
ItemContent.displayName = "ItemContent";

// 4. ItemTitle (nazwa użytkownika / tytuł)
export const ItemTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("font-medium leading-none text-sm", className)} {...props} />
  )
);
ItemTitle.displayName = "ItemTitle";

// 5. ItemDescription (handle / @shadcn / podtytuł)
export const ItemDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-muted-foreground", className)} {...props} />
  )
);
ItemDescription.displayName = "ItemDescription";

// 6. ItemActions (miejsce na przycisk z trzema kropkami)
export const ItemActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center justify-end", className)} {...props} />
  )
);
ItemActions.displayName = "ItemActions";
