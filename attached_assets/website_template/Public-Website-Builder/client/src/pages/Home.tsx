import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Calendar, Users, Star, ArrowRight, Phone, Mail } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCard } from "@/components/ActivityCard";
import type { Activity, AgencyInfo } from "@shared/schema";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: agency } = useQuery<AgencyInfo>({
    queryKey: ["/api/agency"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities?featured=true"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/activities?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const featuredActivities = activities?.filter((a) => a.isFeatured).slice(0, 6) || [];

  return (
    <div>
      <SEO />
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: agency?.heroImage
              ? `url(${agency.heroImage})`
              : "url(https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80)",
          }}
        />
        <div className="absolute inset-0 hero-overlay" />

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 drop-shadow-lg" data-testid="text-hero-title">
            {agency?.heroTitle || t("hero.title")}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-white/90 drop-shadow" data-testid="text-hero-subtitle">
            {agency?.heroSubtitle || t("hero.subtitle")}
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="flex gap-2 bg-white/10 backdrop-blur-md p-2 rounded-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input
                  type="search"
                  placeholder={t("hero.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus-visible:ring-white/50"
                  data-testid="input-search"
                />
              </div>
              <Button type="submit" size="lg" data-testid="button-search">
                {t("hero.explore")}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-6 mt-12">
            <div className="flex items-center gap-2 text-white/80">
              <MapPin className="h-5 w-5" />
              <span>50+ {t("nav.activities")}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Calendar className="h-5 w-5" />
              <span>7/24 {t("common.search")}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Users className="h-5 w-5" />
              <span>10K+ Guests</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Star className="h-5 w-5 fill-accent text-accent" />
              <span>4.9 Rating</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2" data-testid="text-featured-title">
                {t("activities.featured")}
              </h2>
              <p className="text-muted-foreground">{t("activities.subtitle")}</p>
            </div>
            <Link href="/activities">
              <Button variant="ghost" className="gap-2" data-testid="link-view-all">
                {t("activities.all")}
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
          ) : featuredActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("activities.noResults")}</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4" data-testid="text-about-title">
                {t("about.title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {agency?.aboutText ||
                  "We are a leading travel agency dedicated to providing unforgettable experiences. With years of expertise and passion for travel, we curate the best tours and activities to make your journey memorable. Our team of experienced guides and professionals ensure your safety and satisfaction throughout every adventure."}
              </p>
              <Link href="/contact">
                <Button variant="outline" className="gap-2" data-testid="button-learn-more">
                  {t("about.readMore")}
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

      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <p className="text-primary-foreground/80">{t("nav.activities")}</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <p className="text-primary-foreground/80">Happy Guests</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9</div>
              <p className="text-primary-foreground/80">Average Rating</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">{t("contact.title")}</h2>
            <p className="text-muted-foreground mb-8">{t("contact.subtitle")}</p>

            <div className="grid sm:grid-cols-2 gap-6">
              {agency?.phone && (
                <Card className="hover-elevate">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">{t("contact.info.phone")}</p>
                      <a href={`tel:${agency.phone}`} className="font-medium hover:text-primary">
                        {agency.phone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {agency?.email && (
                <Card className="hover-elevate">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">{t("contact.info.email")}</p>
                      <a href={`mailto:${agency.email}`} className="font-medium hover:text-primary">
                        {agency.email}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg" data-testid="button-contact-us">
                  {t("contact.title")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
