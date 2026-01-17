import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Clock, MapPin, Star, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Activity } from "@shared/schema";

interface ActivityCardProps {
  activity: Activity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const { t } = useTranslation();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} ${t("activities.minutes")}`;
    if (mins === 0) return `${hours} ${t(hours === 1 ? "activities.hour" : "activities.hours")}`;
    return `${hours}${t("activities.hour")} ${mins}${t("activities.minutes")}`;
  };

  const hasDiscount = activity.originalPrice && activity.originalPrice > activity.price;

  return (
    <Card className="group overflow-hidden hover-elevate active-elevate-2 transition-all duration-300" data-testid={`card-activity-${activity.id}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={activity.thumbnail}
          alt={activity.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {activity.isFeatured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground" data-testid={`badge-featured-${activity.id}`}>
            {t("activities.featured")}
          </Badge>
        )}

        {hasDiscount && (
          <Badge variant="destructive" className="absolute top-3 right-3" data-testid={`badge-discount-${activity.id}`}>
            -{Math.round((1 - activity.price / activity.originalPrice!) * 100)}%
          </Badge>
        )}

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
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{activity.location}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {activity.shortDescription}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {activity.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-medium">{activity.rating.toFixed(1)}</span>
                {activity.reviewCount && (
                  <span className="text-muted-foreground">({activity.reviewCount})</span>
                )}
              </div>
            )}
          </div>

          <div className="text-right">
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through mr-2">
                {activity.currency} {activity.originalPrice}
              </span>
            )}
            <div className="font-semibold text-lg">
              <span className="text-primary">{activity.currency} {activity.price}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {t("activities.perPerson")}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={`/activities/${activity.slug}`} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-${activity.id}`}>
              {t("activities.viewDetails")}
            </Button>
          </Link>
          <Link href={`/activities/${activity.slug}/book`}>
            <Button data-testid={`button-book-${activity.id}`}>
              {t("activities.bookNow")}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
