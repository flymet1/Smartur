import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Calendar, Users, Star, ArrowRight, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCard } from "../components/ActivityCard";
import type { PublicActivity, PublicWebsiteData } from "../types";
import { useState } from "react";
import { useLocation } from "wouter";
import { getApiUrl } from "../utils";

interface PublicHomeProps {
  websiteData?: PublicWebsiteData;
}

export default function PublicHome({ websiteData }: PublicHomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: activities, isLoading: activitiesLoading } = useQuery<PublicActivity[]>({
    queryKey: [getApiUrl("/api/website/activities")],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/aktiviteler?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const heroImage = websiteData?.websiteHeroImageUrl || 
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80";

  return (
    <div>
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 drop-shadow-lg" data-testid="text-hero-title">
            {websiteData?.websiteTitle || "Unutulmaz Deneyimler"}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-white/90 drop-shadow" data-testid="text-hero-subtitle">
            {websiteData?.websiteDescription || "En iyi turlar ve aktiviteler ile hayalinizdeki tatili yaşayın"}
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="flex gap-2 bg-white/10 backdrop-blur-md p-2 rounded-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input
                  type="search"
                  placeholder="Aktivite ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus-visible:ring-white/50"
                  data-testid="input-search"
                />
              </div>
              <Button type="submit" size="lg" data-testid="button-search">
                Keşfet
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-6 mt-12">
            <div className="flex items-center gap-2 text-white/80">
              <MapPin className="h-5 w-5" />
              <span>{activities?.length || 0}+ Aktivite</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Calendar className="h-5 w-5" />
              <span>7/24 Rezervasyon</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Users className="h-5 w-5" />
              <span>10K+ Mutlu Misafir</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span>4.9 Puan</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2" data-testid="text-featured-title">
                Aktivitelerimiz
              </h2>
              <p className="text-muted-foreground">En popüler turlarımızı keşfedin</p>
            </div>
            <Link href="/aktiviteler">
              <Button variant="ghost" className="gap-2" data-testid="link-view-all">
                Tümünü Gör
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {activitiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[4/3]" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.slice(0, 6).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Henüz aktivite bulunmuyor</p>
            </div>
          )}
        </div>
      </section>

      {websiteData?.websiteAboutText && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4" data-testid="text-about-title">
                  {websiteData?.websiteAboutPageTitle || "Hakkımızda"}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {websiteData.websiteAboutText}
                </p>
                <Link href="/iletisim">
                  <Button variant="outline" className="gap-2" data-testid="button-learn-more">
                    İletişime Geç
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <img
                      src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80"
                      alt="Travel"
                      className="rounded-lg w-full h-48 object-cover"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&q=80"
                      alt="Adventure"
                      className="rounded-lg w-full h-32 object-cover"
                    />
                  </div>
                  <div className="space-y-4 pt-8">
                    <img
                      src="https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&q=80"
                      alt="Experience"
                      className="rounded-lg w-full h-32 object-cover"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=400&q=80"
                      alt="Discovery"
                      className="rounded-lg w-full h-48 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">{activities?.length || 0}+</div>
              <p className="text-primary-foreground/80">Aktivite</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <p className="text-primary-foreground/80">Mutlu Misafir</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9</div>
              <p className="text-primary-foreground/80">Ortalama Puan</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">İletişim</h2>
            <p className="text-muted-foreground mb-8">Sorularınız için bize ulaşın</p>

            <div className="grid sm:grid-cols-2 gap-6">
              {websiteData?.websiteContactPhone && (
                <Card className="hover-elevate">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <a href={`tel:${websiteData.websiteContactPhone}`} className="font-medium hover:text-primary">
                        {websiteData.websiteContactPhone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {websiteData?.websiteContactEmail && (
                <Card className="hover-elevate">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">E-posta</p>
                      <a href={`mailto:${websiteData.websiteContactEmail}`} className="font-medium hover:text-primary">
                        {websiteData.websiteContactEmail}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="mt-8">
              <Link href="/iletisim">
                <Button size="lg" data-testid="button-contact-us">
                  İletişime Geç
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
