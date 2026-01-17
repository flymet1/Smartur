import { Link } from "wouter";
import { Clock, MapPin, Users, Star, Check, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PublicActivity } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

interface ActivityCardProps {
  activity: PublicActivity;
  variant?: "default" | "featured";
}

const languageFlags: Record<string, string> = {
  tr: "TR",
  en: "EN",
  de: "DE",
  ru: "RU",
  fr: "FR",
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  moderate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  challenging: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const difficultyLabels: Record<string, Record<string, string>> = {
  tr: { easy: "Kolay", moderate: "Orta", challenging: "Zor" },
  en: { easy: "Easy", moderate: "Moderate", challenging: "Challenging" },
};

export function ActivityCard({ activity, variant = "default" }: ActivityCardProps) {
  const { t, language } = useLanguage();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} ${t.activities.minutes}`;
    if (mins === 0) return `${hours} ${t.activities.hours}`;
    return `${hours}h ${mins}m`;
  };

  const imageUrl = activity.imageUrl || 
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80";

  const difficultyLabel = difficultyLabels[language]?.[activity.difficulty || "easy"] || 
    difficultyLabels["tr"][activity.difficulty || "easy"];

  return (
    <Card className="group overflow-hidden hover-elevate active-elevate-2 transition-all duration-300 h-full flex flex-col" data-testid={`card-activity-${activity.id}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={activity.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {activity.categories && activity.categories.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {activity.categories.slice(0, 2).map((cat) => (
              <Badge key={cat} variant="secondary" className="bg-white/90 text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {activity.difficulty && (
          <div className="absolute top-3 right-3">
            <Badge className={`${difficultyColors[activity.difficulty]} text-xs`}>
              {difficultyLabel}
            </Badge>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-lg line-clamp-2 drop-shadow-lg mb-1">
            {activity.name}
          </h3>
          {activity.region && (
            <div className="flex items-center gap-1 text-white/90 text-sm">
              <MapPin className="h-3 w-3" />
              <span>{activity.region}</span>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(activity.durationMinutes)}</span>
          </div>
          {activity.tourLanguages && activity.tourLanguages.length > 0 && (
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="flex gap-0.5">
                {activity.tourLanguages.slice(0, 3).map((lang) => (
                  <span key={lang} className="text-xs">{languageFlags[lang] || lang}</span>
                ))}
              </span>
            </div>
          )}
          {activity.maxParticipants && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{activity.maxParticipants}</span>
            </div>
          )}
        </div>

        {activity.highlights && activity.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {activity.highlights.slice(0, 2).map((highlight, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs text-primary">
                <Check className="h-3 w-3" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        )}

        {activity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {activity.description}
          </p>
        )}

        <div className="mt-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs text-muted-foreground">{t.activities.from}</span>
              <div className="font-bold text-xl text-primary">
                {activity.price.toLocaleString()} ₺
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {t.activities.person}
                </span>
              </div>
              {activity.priceUsd && (
                <span className="text-xs text-muted-foreground">
                  ${activity.priceUsd}
                </span>
              )}
            </div>
            {activity.hasFreeHotelTransfer && (
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                Transfer
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Link href={`/aktivite/${activity.id}`} className="flex-1">
              <Button variant="outline" className="w-full" size="sm" data-testid={`button-view-${activity.id}`}>
                {t.activities.details}
              </Button>
            </Link>
            <Link href={`/rezervasyon/${activity.id}`} className="flex-1">
              <Button className="w-full" size="sm" data-testid={`button-book-${activity.id}`}>
                {t.activities.bookNow}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
