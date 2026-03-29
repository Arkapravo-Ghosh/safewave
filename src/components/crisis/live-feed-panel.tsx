import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RealtimeEvent } from "@/hooks/use-realtime-feed";

interface LiveFeedPanelProps {
  events: RealtimeEvent[];
  connected: boolean;
}

export function LiveFeedPanel({ events, connected }: LiveFeedPanelProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Live Feed</CardTitle>
          <Badge variant={connected ? "default" : "outline"}>
            {connected ? "Live" : "Offline"}
          </Badge>
        </div>
        <CardDescription>Realtime broadcast events from incident operations.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-72 space-y-2 overflow-auto pr-1 text-sm">
          {events.length === 0 ? (
            <p className="text-muted-foreground">No realtime updates yet.</p>
          ) : (
            events.map((event, index) => (
              <div key={`${event.timestamp}-${index}`} className="rounded-md border border-border/60 bg-muted/25 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{event.event}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
