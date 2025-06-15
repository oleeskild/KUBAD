import { Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AggregatesPageHeaderProps {
  showKeyboardShortcuts?: boolean;
}

export function AggregatesPageHeader({ showKeyboardShortcuts = true }: AggregatesPageHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            Aggregates
          </h2>
          <p className="text-muted-foreground">
            Browse aggregates by type and navigate with GUID
          </p>
          {showKeyboardShortcuts && (
            <div className="text-xs text-muted-foreground">
              <span className="hidden lg:inline">
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">h/l</kbd>{" "}
                or{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">←→</kbd>{" "}
                switch columns •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">j/k</kbd>{" "}
                or{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑↓</kbd>{" "}
                navigate •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">g/G</kbd>{" "}
                top/bottom •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                  Enter
                </kbd>{" "}
                select •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">p</kbd>{" "}
                pin •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">r</kbd>{" "}
                recent •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">/</kbd>{" "}
                filter •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">e</kbd>{" "}
                expand all
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />
    </>
  );
}