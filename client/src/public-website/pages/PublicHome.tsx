import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Calendar, Users, Star, ArrowRight, Shield, Award, Clock, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCard } from "../components/ActivityCard";
import { WhatsAppButton } from "../components/shared/WhatsAppButton";
import { TrustBadges } from "../components/shared/TrustBadges";
import { CategoryFilter } from "../components/shared/CategoryFilter";
import type { PublicActivity, PublicWebsiteData } from "../types";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";

interface PublicHomeProps {
  websiteData?: PublicWebsiteData;
}

export default function PublicHome({ websiteData }: PublicHomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const { data: activities, isLoading: activitiesLoading } = useQuery<PublicActivity[]>({
    queryKey: [getApiUrl("/api/website/activities")],
  });

  const categories = useMemo(() => {
    if (!activities) return [];
    const allCategories = activities.flatMap(a => a.categories || []);
    return Array.from(new Set(allCategories));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (!selectedCategory) return activities;
    return activities.filter(a => a.categories?.includes(selectedCategory));
  }, [activities, selectedCategory]);

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
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 drop-shadow-lg leading-tight" data-testid="text-hero-title">
              {websiteData?.websiteTitle || t.home.heroTitle}
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-white/90 drop-shadow" data-testid="text-hero-subtitle">
              {websiteData?.websiteDescription || t.home.heroSubtitle}
            </p>

            <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
              <div className="flex gap-2 bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/20">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                  <Input
                    type="search"
                    placeholder={t.common.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus-visible:ring-white/50"
                    data-testid="input-search"
                  />
                </div>
                <Button type="submit" size="lg" data-testid="button-search">
                  {t.common.search}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">{activities?.length || 0}+ {t.common.activities}</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">7/24 {t.home.support}</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">10K+ {t.activities.person}</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">4.9</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      <TrustBadges />

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2" data-testid="text-featured-title">
                {t.home.featuredActivities}
              </h2>
              <p className="text-muted-foreground">{t.home.heroSubtitle}</p>
            </div>
            <Link href="/aktiviteler">
              <Button variant="ghost" className="gap-2" data-testid="link-view-all">
                {t.common.viewAll}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          )}

          {activitiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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
          ) : filteredActivities && filteredActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredActivities.slice(0, 8).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t.activities.noResults}</p>
            </div>
          )}

          {filteredActivities && filteredActivities.length > 8 && (
            <div className="text-center mt-8">
              <Link href="/aktiviteler">
                <Button size="lg" data-testid="button-show-all">
                  {t.common.viewAll} ({filteredActivities.length})
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t.home.whyChooseUs}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t.home.experience}</h3>
              <p className="text-sm text-muted-foreground">{t.home.experienceDesc}</p>
            </div>
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t.home.safety}</h3>
              <p className="text-sm text-muted-foreground">{t.home.safetyDesc}</p>
            </div>
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <ThumbsUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t.home.bestPrice}</h3>
              <p className="text-sm text-muted-foreground">{t.home.bestPriceDesc}</p>
            </div>
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t.home.support}</h3>
              <p className="text-sm text-muted-foreground">{t.home.supportDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {websiteData?.websiteAboutText && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4" data-testid="text-about-title">
                  {websiteData?.websiteAboutPageTitle || t.common.about}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {websiteData.websiteAboutText}
                </p>
                <Link href="/iletisim">
                  <Button variant="outline" className="gap-2" data-testid="button-learn-more">
                    {t.common.contact}
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
                      className="rounded-lg w-full h-48 object-cover shadow-lg"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&q=80"
                      alt="Adventure"
                      className="rounded-lg w-full h-32 object-cover shadow-lg"
                    />
                  </div>
                  <div className="space-y-4 pt-8">
                    <img
                      src="https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&q=80"
                      alt="Experience"
                      className="rounded-lg w-full h-32 object-cover shadow-lg"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&q=80"
                      alt="Explore"
                      className="rounded-lg w-full h-48 object-cover shadow-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <WhatsAppButton phoneNumber={websiteData?.websiteWhatsappNumber} />
    </div>
  );
}
