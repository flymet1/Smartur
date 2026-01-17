import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  Clock,
  MapPin,
  Star,
  Users,
  Check,
  X,
  Globe,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Minus,
  Plus,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { Activity, AvailabilitySlot } from "@shared/schema";

export default function ActivityDetail() {
  const { t } = useTranslation();
  const params = useParams<{ slug: string }>();
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [participants, setParticipants] = useState(1);

  const { data: activity, isLoading } = useQuery<Activity>({
    queryKey: [`/api/activities/${params.slug}`],
  });

  const dateStr = selectedDate?.toISOString().split("T")[0];
  const { data: availability } = useQuery<AvailabilitySlot[]>({
    queryKey: [`/api/availability/${params.slug}/${dateStr}`],
    enabled: !!selectedDate && !!dateStr,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="aspect-[16/9] rounded-lg mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-lg">{t("activities.noResults")}</p>
        <Link href="/activities">
          <Button className="mt-4">{t("activities.all")}</Button>
        </Link>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} ${t("activities.minutes")}`;
    if (mins === 0) return `${hours} ${t(hours === 1 ? "activities.hour" : "activities.hours")}`;
    return `${hours}h ${mins}m`;
  };

  const totalPrice = (selectedSlot?.price || activity.price) * participants;

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % activity.images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + activity.images.length) % activity.images.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={activity.name}
        description={activity.shortDescription}
        image={activity.thumbnail}
        type="product"
      />
      <div className="container mx-auto px-4 py-6">
        <Link href="/activities">
          <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back">
            <ChevronLeft className="h-4 w-4" />
            {t("activities.all")}
          </Button>
        </Link>

        <div className="relative aspect-[16/9] lg:aspect-[21/9] rounded-xl overflow-hidden mb-8">
          <img
            src={activity.images[currentImage]}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {activity.images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40"
                onClick={prevImage}
                data-testid="button-prev-image"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40"
                onClick={nextImage}
                data-testid="button-next-image"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </Button>
            </>
          )}

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className="bg-primary">{activity.categoryName}</Badge>
              {activity.isFeatured && (
                <Badge className="bg-accent text-accent-foreground">
                  {t("activities.featured")}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg" data-testid="text-activity-name">
              {activity.name}
            </h1>
          </div>

          {activity.images.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-1">
              {activity.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentImage ? "bg-white w-4" : "bg-white/50"
                  }`}
                  data-testid={`button-image-dot-${i}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-4 mb-6 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-5 w-5" />
                <span>{formatDuration(activity.durationMinutes)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-5 w-5" />
                <span>{activity.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-5 w-5" />
                <span>Max {activity.maxParticipants}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="h-5 w-5" />
                <span>{activity.languages.join(", ")}</span>
              </div>
              {activity.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="font-medium">{activity.rating.toFixed(1)}</span>
                  {activity.reviewCount && (
                    <span>({activity.reviewCount} {t("activityDetail.reviews")})</span>
                  )}
                </div>
              )}
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="overview" data-testid="tab-overview">{t("activityDetail.overview")}</TabsTrigger>
                <TabsTrigger value="included" data-testid="tab-included">{t("activityDetail.included")}</TabsTrigger>
                <TabsTrigger value="highlights" data-testid="tab-highlights">{t("activityDetail.highlights")}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {activity.description}
                  </p>
                </div>

                {activity.meetingPoint && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {t("activityDetail.meetingPoint")}
                    </h3>
                    <p className="text-muted-foreground">{activity.meetingPoint}</p>
                  </div>
                )}

                {activity.requirements && activity.requirements.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">{t("activityDetail.requirements")}</h3>
                    <ul className="space-y-2">
                      {activity.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="included" className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-green-600 dark:text-green-400">
                    {t("activityDetail.included")}
                  </h3>
                  <ul className="space-y-2">
                    {activity.included.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">
                    {t("activityDetail.notIncluded")}
                  </h3>
                  <ul className="space-y-2">
                    {activity.excluded.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <X className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="highlights">
                <ul className="space-y-3">
                  {activity.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Star className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            <Card>
              <CardHeader>
                <div className="flex items-baseline justify-between">
                  <div>
                    {activity.originalPrice && activity.originalPrice > activity.price && (
                      <span className="text-muted-foreground line-through text-sm mr-2">
                        {activity.currency} {activity.originalPrice}
                      </span>
                    )}
                    <span className="text-3xl font-bold text-primary">
                      {activity.currency} {activity.price}
                    </span>
                  </div>
                  <span className="text-muted-foreground">/ {t("activities.perPerson")}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("activityDetail.selectDate")}
                  </label>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                    data-testid="calendar-date"
                  />
                </div>

                {availability && availability.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t("activityDetail.selectTime")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availability.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                          className="justify-between"
                          onClick={() => setSelectedSlot(slot)}
                          disabled={slot.availableSpots === 0}
                          data-testid={`button-slot-${slot.id}`}
                        >
                          <span>{slot.time}</span>
                          <Badge variant="secondary" className="ml-2">
                            {slot.availableSpots} {t("activityDetail.spotsLeft")}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("activityDetail.participants")}
                  </label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setParticipants(Math.max(1, participants - 1))}
                      disabled={participants <= 1}
                      data-testid="button-decrease-participants"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-medium w-8 text-center" data-testid="text-participants">
                      {participants}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setParticipants(
                          Math.min(selectedSlot?.availableSpots || activity.maxParticipants, participants + 1)
                        )
                      }
                      disabled={participants >= (selectedSlot?.availableSpots || activity.maxParticipants)}
                      data-testid="button-increase-participants"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>{t("activityDetail.totalPrice")}</span>
                    <span className="text-primary" data-testid="text-total-price">
                      {activity.currency} {totalPrice}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/activities/${params.slug}/book?date=${selectedDate?.toISOString().split("T")[0] || ""}&slot=${selectedSlot?.id || ""}&participants=${participants}`}
                >
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!selectedDate || !selectedSlot}
                    data-testid="button-continue-booking"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    {t("activityDetail.continueBooking")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
