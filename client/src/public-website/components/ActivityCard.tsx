import { Link } from "wouter";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PublicActivity } from "../types";

interface ActivityCardProps {
  activity: PublicActivity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} dk`;
    if (mins === 0) return `${hours} saat`;
    return `${hours} saat ${mins} dk`;
  };

  const imageUrl = activity.imageUrl || 
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80";

  return (
    <Card className="group overflow-hidden hover-elevate active-elevate-2 transition-all duration-300" data-testid={`card-activity-${activity.id}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={activity.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-semibold text-lg line-clamp-2 drop-shadow-md">
            {activity.name}
          </h3>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(activity.durationMinutes)}</span>
          </div>
          {activity.hasFreeHotelTransfer && (
            <div className="flex items-center gap-1 text-green-600">
              <MapPin className="h-4 w-4" />
              <span>Ücretsiz Transfer</span>
            </div>
          )}
        </div>

        {activity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {activity.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="text-right">
            <div className="font-semibold text-lg">
              <span className="text-primary">{activity.price} ₺</span>
              {activity.priceUsd && (
                <span className="text-xs text-muted-foreground ml-1">
                  / ${activity.priceUsd}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={`/aktivite/${activity.id}`} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-${activity.id}`}>
              Detaylar
            </Button>
          </Link>
          <Link href={`/rezervasyon/${activity.id}`}>
            <Button data-testid={`button-book-${activity.id}`}>
              Rezervasyon
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
