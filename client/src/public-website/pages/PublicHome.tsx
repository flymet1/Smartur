import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Calendar, Users, Star, ArrowRight, Shield, Award, Clock, ThumbsUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setLocation] = useLocation();
  const { t, language, getLocalizedPath } = useLanguage();

  // Reset slide when data changes
  const heroSlides = Array.isArray(websiteData?.websiteHeroSlides) ? websiteData.websiteHeroSlides : [];
  const promoBoxes = Array.isArray(websiteData?.websitePromoBoxes) ? websiteData.websitePromoBoxes : [];
  const rawSliderPosition = websiteData?.websiteHeroSliderPosition || "after_hero";
  // Fallback: if old "top" value exists, treat it as "after_hero"
  const sliderPosition = rawSliderPosition === "top" ? "after_hero" : rawSliderPosition;

  // Slider section render function
  const renderSliderSection = () => {
    if (!websiteData?.websiteHeroSliderEnabled || heroSlides.length === 0) return null;
    
    return (
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {(websiteData.websiteHeroSliderTitle || websiteData.websiteHeroSliderTitleEn) && (
            <h2 className="text-2xl font-bold text-center mb-8">
              {language === "en" 
                ? (websiteData.websiteHeroSliderTitleEn || websiteData.websiteHeroSliderTitle)
                : (websiteData.websiteHeroSliderTitle || websiteData.websiteHeroSliderTitleEn)
              }
            </h2>
          )}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div className="relative overflow-hidden rounded-xl" style={{ minHeight: '380px' }}>
                {heroSlides.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className={`absolute inset-0 transition-opacity duration-500 flex ${
                      idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    {/* Sol taraf - Görsel */}
                    <div className="w-1/2 relative overflow-hidden rounded-l-xl">
                      {slide.imageUrl ? (
                        <img
                          src={slide.imageUrl}
                          alt={language === "en" ? slide.titleEn || slide.title : slide.title || slide.titleEn}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400" />
                      )}
                      {/* Alt kısımda küçük açıklama */}
                      {slide.imageCaption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3">
                          <p className="text-white text-xs">{slide.imageCaption}</p>
                        </div>
                      )}
                    </div>
                    {/* Sağ taraf - Yazılar ve renkli arka plan */}
                    <div 
                      className="w-1/2 flex flex-col justify-center p-6 md:p-8 rounded-r-xl"
                      style={{ backgroundColor: slide.backgroundColor || '#3b82f6' }}
                    >
                      {/* Üst badge/etiket */}
                      {slide.badge && (
                        <span className="inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full mb-3 w-fit">
                          {language === "en" ? (slide.badgeEn || slide.badge) : (slide.badge || slide.badgeEn)}
                        </span>
                      )}
                      <h3 
                        className="text-xl md:text-2xl lg:text-3xl mb-3 text-white leading-tight"
                        dangerouslySetInnerHTML={{
                          __html: (language === "en" ? (slide.titleEn || slide.title) : (slide.title || slide.titleEn)) || ''
                        }}
                      />
                      <div 
                        className="text-sm md:text-base text-white/90 mb-4 leading-relaxed slider-content"
                        dangerouslySetInnerHTML={{
                          __html: (language === "en" ? (slide.contentEn || slide.content) : (slide.content || slide.contentEn)) || ''
                        }}
                      />
                      {slide.buttonUrl && slide.buttonText && (
                        <div>
                          <Link href={slide.buttonUrl}>
                            <Button variant="outline" size="sm" className="bg-white text-foreground hover:bg-white/90 border-white">
                              {language === "en" ? (slide.buttonTextEn || slide.buttonText) : (slide.buttonText || slide.buttonTextEn)}
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {heroSlides.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentSlide(prev => prev === 0 ? heroSlides.length - 1 : prev - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => setCurrentSlide(prev => prev === heroSlides.length - 1 ? 0 : prev + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 rounded-full p-2 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                    <div className="absolute bottom-4 left-1/4 -translate-x-1/2 z-20 flex gap-2">
                      {heroSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${idx === currentSlide ? 'bg-white' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {promoBoxes.length > 0 && (
              <div className="hidden lg:flex flex-col gap-4 w-80">
                {promoBoxes.slice(0, 2).map((box, idx) => (
                  <div
                    key={box.id || idx}
                    className="relative overflow-hidden rounded-xl flex-1"
                    style={{ backgroundColor: box.backgroundColor || '#f97316', minHeight: '150px' }}
                  >
                    {box.imageUrl && (
                      <img
                        src={box.imageUrl}
                        alt={language === "en" ? box.titleEn || box.title : box.title || box.titleEn}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative z-10 h-full flex flex-col justify-center p-5 text-white">
                      <h4 className="text-lg font-bold mb-1">
                        {language === "en" ? (box.titleEn || box.title) : (box.title || box.titleEn)}
                      </h4>
                      <p className="text-xs opacity-90 mb-2 line-clamp-2">
                        {language === "en" ? (box.contentEn || box.content) : (box.content || box.contentEn)}
                      </p>
                      {box.buttonUrl && box.buttonText && (
                        <Link href={box.buttonUrl}>
                          <Button variant="secondary" size="sm" className="text-xs">
                            {language === "en" ? (box.buttonTextEn || box.buttonText) : (box.buttonText || box.buttonTextEn)}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };
  
  // Reset currentSlide if out of bounds
  if (heroSlides.length > 0 && currentSlide >= heroSlides.length) {
    setCurrentSlide(0);
  }

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
                  <SelectTrigger className="flex-1 h-10 bg-white/20 border-white/30 text-white [&>span]:text-white/90 [&_svg]:text-white/70" data-testid="select-activity">
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
                  <SelectTrigger className="flex-1 h-10 bg-white/20 border-white/30 text-white [&>span]:text-white/90 [&_svg]:text-white/70" data-testid="select-region">
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
                      className="flex-1 h-10 justify-start bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white"
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

                <Button onClick={handleSearch} className="h-10 md:w-auto w-full" data-testid="button-search">
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

      </section>

      {/* Hero Slider Section - Rendered based on position: after_hero */}
      {sliderPosition === "after_hero" && renderSliderSection()}

      {/* Slogan Banner - Purple gradient, above Promo Banner */}
      {websiteData?.websiteSloganBannerEnabled && (
        <section className="py-16 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center text-white">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 leading-tight" data-testid="text-slogan-title">
                {language === "en" && websiteData?.websiteSloganBannerTitleEn
                  ? websiteData.websiteSloganBannerTitleEn
                  : websiteData?.websiteSloganBannerTitle || ""}
              </h2>
              {(websiteData?.websiteSloganBannerDescription || websiteData?.websiteSloganBannerDescriptionEn) && (
                <p className="text-lg md:text-xl text-white/90 leading-relaxed" data-testid="text-slogan-description">
                  {language === "en" && websiteData?.websiteSloganBannerDescriptionEn
                    ? websiteData.websiteSloganBannerDescriptionEn
                    : websiteData?.websiteSloganBannerDescription || ""}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Promotional CTA Banner - Above Trust Badges */}
      {websiteData?.websitePromoBannerEnabled && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500">
              <div className="flex flex-col md:flex-row items-center">
                <div className="flex-1 p-8 md:p-12 text-white">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-promo-title">
                    {language === "en" && websiteData?.websitePromoBannerTitleEn
                      ? websiteData.websitePromoBannerTitleEn
                      : websiteData?.websitePromoBannerTitle || "Türkiye'nin Her Noktasını Keşfedin"}
                  </h2>
                  <p className="text-white/90 mb-6 max-w-md" data-testid="text-promo-description">
                    {language === "en" && websiteData?.websitePromoBannerDescriptionEn
                      ? websiteData.websitePromoBannerDescriptionEn
                      : websiteData?.websitePromoBannerDescription || "Eşsiz deneyimler ve unutulmaz anılar için hemen rezervasyon yapın!"}
                  </p>
                  <Link href={websiteData?.websitePromoBannerButtonUrl || getLocalizedPath("/aktiviteler")}>
                    <Button 
                      variant="secondary" 
                      className="bg-white text-indigo-600 hover:bg-white/90"
                      data-testid="button-promo-cta"
                    >
                      {language === "en" && websiteData?.websitePromoBannerButtonTextEn
                        ? websiteData.websitePromoBannerButtonTextEn
                        : websiteData?.websitePromoBannerButtonText || "Hemen İncele"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="relative flex-1 min-h-[200px] md:min-h-[280px]">
                  {websiteData?.websitePromoBannerImage ? (
                    <img 
                      src={websiteData.websitePromoBannerImage} 
                      alt="Promo" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-400/20" />
                  )}
                  {websiteData?.websitePromoBannerPriceText && (
                    <div className="absolute top-4 right-4 bg-white rounded-lg px-4 py-2 shadow-lg">
                      <p className="text-xs text-muted-foreground">
                        {language === "en" ? "Starting from" : "başlayan fiyatlarla"}
                      </p>
                      <p className="text-lg font-bold text-indigo-600">
                        {language === "en" && websiteData?.websitePromoBannerPriceTextEn
                          ? websiteData.websitePromoBannerPriceTextEn
                          : websiteData.websitePromoBannerPriceText}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <TrustBadges />

      {/* Hero Slider Section - Rendered based on position: before_featured */}
      {sliderPosition === "before_featured" && renderSliderSection()}

      {(websiteData?.websiteShowFeaturedActivities !== false) && (
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
      )}

      {/* Hero Slider Section - Rendered based on position: after_featured */}
      {sliderPosition === "after_featured" && renderSliderSection()}

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

      {/* Review Cards Section */}
      {websiteData?.websiteReviewCardsEnabled && websiteData.websiteReviewCards && websiteData.websiteReviewCards.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              {language === "en" 
                ? (websiteData.websiteReviewCardsTitleEn || "Our Customers Recommend Us")
                : (websiteData.websiteReviewCardsTitle || "Müşterilerimiz Bizi Öneriyor")
              }
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {websiteData.websiteReviewCards.map((card, idx) => (
                <a
                  key={idx}
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`review-card-${card.platform}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {card.platform === "google" && (
                      <div className="w-6 h-6 bg-[#4285F4] rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
                    )}
                    {card.platform === "tripadvisor" && (
                      <div className="w-6 h-6 bg-[#00AF87] rounded-full flex items-center justify-center text-white text-xs font-bold">T</div>
                    )}
                    {card.platform === "trustpilot" && (
                      <div className="w-6 h-6 bg-[#00B67A] rounded-full flex items-center justify-center text-white text-xs font-bold">★</div>
                    )}
                    {card.platform === "facebook" && (
                      <div className="w-6 h-6 bg-[#1877F2] rounded-full flex items-center justify-center text-white text-xs font-bold">f</div>
                    )}
                    <span className="font-semibold capitalize">{card.platform === "tripadvisor" ? "TripAdvisor" : card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.floor(parseFloat(card.rating)) ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                      />
                    ))}
                    <span className="ml-1 font-semibold">{card.rating}/5</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "en" ? `Based on ${card.reviewCount} Reviews` : `${card.reviewCount} Yorum Üzerinden`}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <WhatsAppButton phoneNumber={websiteData?.websiteWhatsappNumber} />
    </div>
  );
}
