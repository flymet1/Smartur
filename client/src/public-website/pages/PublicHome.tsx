import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Calendar, Users, Star, ArrowRight, Shield, Award, Clock, ThumbsUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ActivityCard } from "../components/ActivityCard";
import { WhatsAppButton } from "../components/shared/WhatsAppButton";
import { TrustBadges } from "../components/shared/TrustBadges";
import { CategoryFilter } from "../components/shared/CategoryFilter";
import { SEO } from "../components/shared/SEO";
import type { PublicActivity, PublicWebsiteData } from "../types";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";
import { format } from "date-fns";
import { tr as trLocale, enUS } from "date-fns/locale";

interface HomepageSectionWithActivities {
  id: number;
  title: string;
  subtitle: string | null;
  sectionType: string;
  activities: PublicActivity[];
}

interface PublicHomeProps {
  websiteData?: PublicWebsiteData;
}

export default function PublicHome({ websiteData }: PublicHomeProps) {
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { t, language, getLocalizedPath } = useLanguage();

  const { data: activities, isLoading: activitiesLoading } = useQuery<PublicActivity[]>({
    queryKey: [getApiUrl(`/api/website/activities?lang=${language}`)],
  });

  const { data: homepageSections, isLoading: sectionsLoading } = useQuery<HomepageSectionWithActivities[]>({
    queryKey: [getApiUrl(`/api/website/homepage-sections?lang=${language}`)],
  });

  const categories = useMemo(() => {
    if (!activities) return [];
    const allCategories = activities.flatMap(a => a.categories || []);
    return Array.from(new Set(allCategories));
  }, [activities]);

  const regions = useMemo(() => {
    if (!activities) return [];
    const allRegions = activities.map(a => a.region).filter(Boolean) as string[];
    return Array.from(new Set(allRegions));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (!selectedCategory) return activities;
    return activities.filter(a => a.categories?.includes(selectedCategory));
  }, [activities, selectedCategory]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedActivity) params.set("activity", selectedActivity);
    if (selectedRegion) params.set("region", selectedRegion);
    if (selectedDate) params.set("date", format(selectedDate, "yyyy-MM-dd"));
    
    const queryString = params.toString();
    setLocation(getLocalizedPath(`/aktiviteler${queryString ? `?${queryString}` : ""}`));
  };

  const dateLocale = language === "tr" ? trLocale : enUS;

  const heroImage = websiteData?.websiteHeroImageUrl || 
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80";

  return (
    <div>
      <SEO 
        websiteData={websiteData} 
        language={language}
      />
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

            <div className="max-w-4xl mx-auto mb-8">
              <div className="flex flex-col md:flex-row gap-3 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                  <SelectTrigger className="flex-1 bg-white/20 border-white/30 text-white [&>span]:text-white/90 [&_svg]:text-white/70" data-testid="select-activity">
                    <MapPin className="h-4 w-4 mr-2 text-white/70" />
                    <SelectValue placeholder={t.home.selectActivity} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.home.allActivities}</SelectItem>
                    {activities?.map((activity) => (
                      <SelectItem key={activity.id} value={String(activity.id)}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="flex-1 bg-white/20 border-white/30 text-white [&>span]:text-white/90 [&_svg]:text-white/70" data-testid="select-region">
                    <MapPin className="h-4 w-4 mr-2 text-white/70" />
                    <SelectValue placeholder={t.home.selectRegion} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.home.allRegions}</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white"
                      data-testid="button-date-picker"
                    >
                      <Calendar className="h-4 w-4 mr-2 text-white/70" />
                      {selectedDate ? format(selectedDate, "dd MMM yyyy", { locale: dateLocale }) : t.home.selectDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={dateLocale}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button size="lg" onClick={handleSearch} className="md:w-auto w-full" data-testid="button-search">
                  <Search className="h-4 w-4 mr-2" />
                  {t.common.search}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8 mt-12">
              {(websiteData?.websiteHeroStats && Array.isArray(websiteData.websiteHeroStats) && websiteData.websiteHeroStats.length > 0) ? (
                websiteData.websiteHeroStats.map((stat: any, index: number) => {
                  const IconComponent = stat.icon === "star" ? Star : 
                                        stat.icon === "clock" ? Clock : 
                                        stat.icon === "users" ? Users : 
                                        stat.icon === "calendar" ? Calendar : 
                                        stat.icon === "shield" ? Shield :
                                        stat.icon === "award" ? Award :
                                        stat.icon === "thumbsup" ? ThumbsUp :
                                        MapPin;
                  const label = language === "en" && stat.labelEn ? stat.labelEn : stat.label;
                  return (
                    <div key={index} className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <span className="font-medium">{stat.value} {label}</span>
                    </div>
                  );
                })
              ) : (
                <>
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
                </>
              )}
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
            <Link href={getLocalizedPath("/aktiviteler")}>
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
              <Link href={getLocalizedPath("/aktiviteler")}>
                <Button size="lg" data-testid="button-show-all">
                  {t.common.viewAll} ({filteredActivities.length})
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {homepageSections && homepageSections.length > 0 && homepageSections.map((section, index) => (
        <section 
          key={section.id} 
          className={`py-16 ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
          data-testid={`section-${section.id}`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold mb-2">{section.title}</h2>
                {section.subtitle && (
                  <p className="text-muted-foreground">{section.subtitle}</p>
                )}
              </div>
              <Link href={getLocalizedPath("/aktiviteler")}>
                <Button variant="ghost" className="gap-2">
                  {t.common.viewAll}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {section.activities && section.activities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {section.activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t.activities.noResults}
              </div>
            )}
          </div>
        </section>
      ))}

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
