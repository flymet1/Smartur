import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { 
  Clock, MapPin, Users, Check, X, ChevronLeft, Calendar, Info, 
  Star, Globe, Shield, Camera, Share2, Heart, AlertCircle,
  Mountain, Zap, Award, Phone, MessageCircle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { PublicActivity } from "../types";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";

const difficultyConfig: Record<string, { label: string; labelEn: string; color: string; icon: typeof Mountain }> = {
  easy: { label: "Kolay", labelEn: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", icon: Zap },
  moderate: { label: "Orta", labelEn: "Moderate", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300", icon: Mountain },
  challenging: { label: "Zor", labelEn: "Challenging", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", icon: AlertCircle },
};

const languageFlags: Record<string, { name: string; flag: string }> = {
  tr: { name: "Turkce", flag: "TR" },
  en: { name: "English", flag: "EN" },
  de: { name: "Deutsch", flag: "DE" },
  ru: { name: "Pусский", flag: "RU" },
  fr: { name: "Francais", flag: "FR" },
};

export default function PublicActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const activityId = parseInt(id || "0");
  const { t, language } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: activity, isLoading } = useQuery<PublicActivity>({
    queryKey: [getApiUrl(`/api/website/activities/${activityId}`)],
    enabled: activityId > 0,
  });

  const { data: allActivities } = useQuery<PublicActivity[]>({
    queryKey: [getApiUrl("/api/website/activities")],
  });

  const relatedActivities = allActivities?.filter(a => 
    a.id !== activityId && 
    a.categories?.some(cat => activity?.categories?.includes(cat))
  ).slice(0, 3);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (language === "en") {
      if (hours === 0) return `${mins} minutes`;
      if (mins === 0) return `${hours} hours`;
      return `${hours}h ${mins}m`;
    }
    if (hours === 0) return `${mins} dakika`;
    if (mins === 0) return `${hours} saat`;
    return `${hours} saat ${mins} dakika`;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: activity?.name,
          text: activity?.description || undefined,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-[50vh] md:h-[60vh]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-80 w-full rounded-lg" />
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
          <h1 className="text-2xl font-bold mb-4">
            {language === "en" ? "Activity Not Found" : "Aktivite Bulunamadı"}
          </h1>
          <Link href="/aktiviteler">
            <Button>{language === "en" ? "Back to Activities" : "Aktivitelere Dön"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = activity.imageUrl || 
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80";
  
  const allImages = [mainImage, ...(activity.galleryImages || [])];
  const difficulty = difficultyConfig[activity.difficulty || "easy"];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img
          src={mainImage}
          alt={activity.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <Link href="/aktiviteler">
            <Button variant="outline" size="sm" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {language === "en" ? "Back" : "Geri"}
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              {activity.categories?.map((cat, idx) => (
                <Badge key={idx} className="bg-primary/90 text-primary-foreground">
                  {cat}
                </Badge>
              ))}
              {activity.difficulty && (
                <Badge className={difficulty.color}>
                  <difficulty.icon className="h-3 w-3 mr-1" />
                  {language === "en" ? difficulty.labelEn : difficulty.label}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3" data-testid="text-activity-name">
              {activity.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              {activity.region && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{activity.region}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(activity.durationMinutes)}</span>
              </div>
              {activity.maxParticipants && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{language === "en" ? `Max ${activity.maxParticipants} people` : `Maks ${activity.maxParticipants} kişi`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {activity.highlights && activity.highlights.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {activity.highlights.slice(0, 4).map((highlight, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{highlight}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold mb-4">
                {language === "en" ? "About This Experience" : "Bu Deneyim Hakkında"}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {activity.description}
              </p>
            </div>

            {allImages.length > 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {language === "en" ? "Gallery" : "Galeri"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allImages.slice(0, 8).map((img, idx) => (
                    <Dialog key={idx}>
                      <DialogTrigger asChild>
                        <div 
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover-elevate"
                          onClick={() => setSelectedImage(img)}
                        >
                          <img src={img} alt={`${activity.name} ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0 overflow-hidden">
                        <img src={img} alt={activity.name} className="w-full h-auto" />
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {activity.includedItems && activity.includedItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      {language === "en" ? "What's Included" : "Dahil Olanlar"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {activity.includedItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {activity.excludedItems && activity.excludedItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                      <X className="h-5 w-5" />
                      {language === "en" ? "Not Included" : "Dahil Olmayanlar"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {activity.excludedItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {language === "en" ? "Important Information" : "Onemli Bilgiler"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {activity.meetingPoint && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{language === "en" ? "Meeting Point" : "Bulusma Noktası"}</p>
                        <p className="text-sm text-muted-foreground">{activity.meetingPoint}</p>
                      </div>
                    </div>
                  )}

                  {activity.minAge != null && activity.minAge > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium">{language === "en" ? "Minimum Age" : "Minimum Yas"}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.minAge} {language === "en" ? "years old" : "yas ve uzeri"}
                        </p>
                      </div>
                    </div>
                  )}

                  {activity.tourLanguages && activity.tourLanguages.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">{language === "en" ? "Languages" : "Diller"}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activity.tourLanguages.map((lang, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {languageFlags[lang]?.flag || lang.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">{language === "en" ? "Safety" : "Guvenlik"}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === "en" ? "Full insurance coverage" : "Tam sigorta kapsamı"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {activity.transferZones && activity.transferZones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {language === "en" ? "Transfer Zones" : "Transfer Bolgeleri"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {language === "en" 
                      ? "Free hotel pickup available from these areas:" 
                      : "Bu bolgelerden ucretsiz otel transferi mevcuttur:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activity.transferZones.map((zone, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
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
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {language === "en" ? "Optional Extras" : "Ekstra Hizmetler"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activity.extras.map((extra, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                        <div>
                          <p className="font-medium">{extra.name}</p>
                          {extra.description && (
                            <p className="text-sm text-muted-foreground">{extra.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">+{extra.priceTl} TL</p>
                          {extra.priceUsd > 0 && (
                            <p className="text-xs text-muted-foreground">${extra.priceUsd}</p>
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
                    <MessageCircle className="h-5 w-5" />
                    {language === "en" ? "Frequently Asked Questions" : "Sık Sorulan Sorular"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {activity.faq.map((item, idx) => (
                      <AccordionItem key={idx} value={`faq-${idx}`}>
                        <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="bg-primary/5 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === "en" ? "From" : "Baslayan fiyat"}
                    </span>
                    {activity.priceUsd && (
                      <Badge variant="secondary">${activity.priceUsd}</Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-primary">
                      {activity.price.toLocaleString()}
                    </span>
                    <span className="text-xl">TL</span>
                    <span className="text-muted-foreground">/ {language === "en" ? "person" : "kisi"}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{language === "en" ? "Instant confirmation" : "Anında onay"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{language === "en" ? "Free cancellation" : "Ucretsiz iptal"}</span>
                    </div>
                    {activity.hasFreeHotelTransfer && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{language === "en" ? "Free hotel transfer" : "Ucretsiz otel transferi"}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{language === "en" ? "Full insurance" : "Tam sigorta"}</span>
                    </div>
                  </div>

                  <Separator />

                  {activity.defaultTimes && activity.defaultTimes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        {language === "en" ? "Available Times" : "Musait Saatler"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activity.defaultTimes.map((time, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            <Clock className="h-3 w-3 mr-1" />
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link href={`/rezervasyon/${activity.id}`}>
                    <Button size="lg" className="w-full gap-2 text-lg h-14" data-testid="button-book-now">
                      <Calendar className="h-5 w-5" />
                      {language === "en" ? "Book Now" : "Hemen Rezervasyon Yap"}
                    </Button>
                  </Link>

                  <p className="text-xs text-center text-muted-foreground">
                    {language === "en" 
                      ? "Reserve now, pay later - secure your spot today!" 
                      : "Simdi rezerve et, sonra ode - yerinizi garantileyin!"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-3">
                    {language === "en" ? "Need Help?" : "Yardıma mı ihtiyacınız var?"}
                  </p>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Phone className="h-4 w-4" />
                      {language === "en" ? "Call Us" : "Bizi Arayın"}
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {relatedActivities && relatedActivities.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {language === "en" ? "You May Also Like" : "Bunları da Begenebilirsiniz"}
              </h2>
              <Link href="/aktiviteler">
                <Button variant="ghost" className="gap-1">
                  {language === "en" ? "View All" : "Tumunu Gor"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedActivities.map((related) => (
                <Link key={related.id} href={`/aktivite/${related.id}`}>
                  <Card className="overflow-hidden hover-elevate cursor-pointer h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={related.imageUrl || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80"}
                        alt={related.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-semibold text-white">{related.name}</h3>
                      </div>
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatDuration(related.durationMinutes)}
                        </div>
                        <div className="font-bold text-primary">
                          {related.price.toLocaleString()} TL
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
