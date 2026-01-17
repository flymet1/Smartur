import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Clock, MapPin, Users, Check, ChevronLeft, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PublicActivity } from "../types";
import { getApiUrl } from "../utils";

export default function PublicActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const activityId = parseInt(id || "0");

  const { data: activity, isLoading } = useQuery<PublicActivity>({
    queryKey: [getApiUrl(`/api/website/activities/${activityId}`)],
    enabled: activityId > 0,
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} dakika`;
    if (mins === 0) return `${hours} saat`;
    return `${hours} saat ${mins} dakika`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-video rounded-lg" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Aktivite Bulunamadı</h1>
          <Link href="/aktiviteler">
            <Button>Aktivitelere Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = activity.imageUrl || 
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/aktiviteler">
          <Button variant="ghost" className="mb-6 gap-2">
            <ChevronLeft className="h-4 w-4" />
            Aktivitelere Dön
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={activity.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-4" data-testid="text-activity-name">
                {activity.name}
              </h1>

              <div className="flex flex-wrap gap-4 mb-6">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(activity.durationMinutes)}
                </Badge>
                {activity.hasFreeHotelTransfer && (
                  <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                    <MapPin className="h-4 w-4" />
                    Ücretsiz Transfer
                  </Badge>
                )}
              </div>

              {activity.description && (
                <div className="prose max-w-none">
                  <h2 className="text-xl font-semibold mb-2">Açıklama</h2>
                  <p className="text-muted-foreground">{activity.description}</p>
                </div>
              )}
            </div>

            {activity.transferZones && activity.transferZones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Transfer Bölgeleri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {activity.transferZones.map((zone, idx) => (
                      <Badge key={idx} variant="outline">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activity.extras && activity.extras.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ekstra Hizmetler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activity.extras.map((extra, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{extra.name}</p>
                          {extra.description && (
                            <p className="text-sm text-muted-foreground">{extra.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{extra.priceTl} ₺</p>
                          {extra.priceUsd > 0 && (
                            <p className="text-sm text-muted-foreground">${extra.priceUsd}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activity.faq && activity.faq.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Sık Sorulan Sorular
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {activity.faq.map((item, idx) => (
                      <AccordionItem key={idx} value={`faq-${idx}`}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>{item.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Fiyat Bilgisi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {activity.price} ₺
                  </div>
                  {activity.priceUsd && (
                    <div className="text-lg text-muted-foreground">
                      ${activity.priceUsd}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">kişi başı</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Anında onay</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Ücretsiz iptal</span>
                  </div>
                  {activity.hasFreeHotelTransfer && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Ücretsiz otel transferi</span>
                    </div>
                  )}
                </div>

                {activity.defaultTimes && activity.defaultTimes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Mevcut Saatler</p>
                    <div className="flex flex-wrap gap-2">
                      {activity.defaultTimes.map((time, idx) => (
                        <Badge key={idx} variant="outline">
                          {time}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Link href={`/rezervasyon/${activity.id}`}>
                  <Button size="lg" className="w-full gap-2" data-testid="button-book-now">
                    <Calendar className="h-5 w-5" />
                    Rezervasyon Yap
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
