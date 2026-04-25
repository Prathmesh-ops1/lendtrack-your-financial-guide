import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INSIGHTS, pickInsightForToday, type Insight } from "@/lib/insights";
import { Lightbulb, RefreshCw } from "lucide-react";

export function InsightsPanel() {
  const [insight, setInsight] = useState<Insight>(() => pickInsightForToday());

  // Auto-rotate every 12 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setInsight((prev) => {
        const idx = INSIGHTS.indexOf(prev);
        return INSIGHTS[(idx + 1) % INSIGHTS.length];
      });
    }, 12000);
    return () => clearInterval(id);
  }, []);

  function refresh() {
    setInsight((prev) => {
      let next = prev;
      while (next === prev) {
        next = INSIGHTS[Math.floor(Math.random() * INSIGHTS.length)];
      }
      return next;
    });
  }

  return (
    <Card className="overflow-hidden border-border/60 shadow-card-soft">
      <div className="bg-gradient-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          <span className="font-display text-sm font-semibold">Smart insights</span>
        </div>
      </div>
      <CardContent className="space-y-3 p-5">
        <Badge variant="secondary" className="bg-gold/20 text-gold-foreground">
          {insight.tag}
        </Badge>
        <h3 className="font-display text-base font-bold leading-snug">{insight.title}</h3>
        <p className="text-sm text-muted-foreground">{insight.body}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={refresh}
          className="mt-2 h-8 gap-1 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3" /> Next tip
        </Button>
      </CardContent>
    </Card>
  );
}
