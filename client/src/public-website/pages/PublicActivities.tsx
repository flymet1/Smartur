import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Search, X, SlidersHorizontal, ArrowUpDown, MapPin, Tag, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ActivityCard } from "../components/ActivityCard";
import type { PublicActivity } from "../types";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc" | "duration-asc" | "duration-desc";

export default function PublicActivities() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialSearch = urlParams.get("search") || "";
  const initialRegion = urlParams.get("region") || "";
  const initialActivity = urlParams.get("activity") || "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedRegion, setSelectedRegion] = useState(initialRegion === "all" ? "" : initialRegion);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { t, language } = useLanguage();

  const { data: activities, isLoading } = useQuery<PublicActivity[]>({
    queryKey: [getApiUrl(`/api/website/activities?lang=${language}`)],
  });

  const regions = useMemo(() => {
    if (!activities) return [];
    const allRegions = activities.map(a => a.region).filter(Boolean) as string[];
    return Array.from(new Set(allRegions));
  }, [activities]);

  const categories = useMemo(() => {
    if (!activities) return [];
    const allCategories = activities.flatMap(a => a.categories || []);
    return Array.from(new Set(allCategories));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];

    let result = [...activities];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          (a.description && a.description.toLowerCase().includes(query))
      );
    }

    if (selectedRegion) {
      result = result.filter(a => a.region === selectedRegion);
    }

    if (selectedCategory) {
      result = result.filter(a => a.categories?.includes(selectedCategory));
    }

    if (initialActivity && initialActivity !== "all") {
      const activityId = parseInt(initialActivity);
      if (!isNaN(activityId)) {
        result = result.filter(a => a.id === activityId);
      }
    }

    switch (sortOption) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name, language));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name, language));
        break;
      case "duration-asc":
        result.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case "duration-desc":
        result.sort((a, b) => b.durationMinutes - a.durationMinutes);
        break;
    }

    return result;
  }, [activities, searchQuery, selectedRegion, selectedCategory, sortOption, initialActivity, language]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRegion("");
    setSelectedCategory("");
    setSortOption("default");
  };

  const hasActiveFilters = !!searchQuery || !!selectedRegion || !!selectedCategory || sortOption !== "default";
  const activeFilterCount = [searchQuery, selectedRegion, selectedCategory, sortOption !== "default" ? "sort" : ""].filter(Boolean).length;

  const sortLabels: Record<SortOption, string> = {
    default: language === "tr" ? "Varsayılan" : "Default",
    "price-asc": language === "tr" ? "Fiyat (Düşükten Yükseğe)" : "Price (Low to High)",
    "price-desc": language === "tr" ? "Fiyat (Yüksekten Düşüğe)" : "Price (High to Low)",
    "name-asc": language === "tr" ? "İsim (A-Z)" : "Name (A-Z)",
    "name-desc": language === "tr" ? "İsim (Z-A)" : "Name (Z-A)",
    "duration-asc": language === "tr" ? "Süre (Kısa-Uzun)" : "Duration (Short-Long)",
    "duration-desc": language === "tr" ? "Süre (Uzun-Kısa)" : "Duration (Long-Short)",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-activities-title">
            {t.activities.title}
          </h1>
          <p className="text-muted-foreground">{t.activities.subtitle}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t.common.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-activities"
            />
          </div>

          <div className="hidden lg:flex gap-3">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-region">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={language === "tr" ? "Bölge" : "Region"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "tr" ? "Tüm Bölgeler" : "All Regions"}</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={language === "tr" ? "Kategori" : "Category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "tr" ? "Tüm Kategoriler" : "All Categories"}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-[200px]" data-testid="select-sort">
                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={language === "tr" ? "Sırala" : "Sort"} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:hidden">
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full gap-2" data-testid="button-mobile-filter">
                  <SlidersHorizontal className="h-4 w-4" />
                  {language === "tr" ? "Filtrele & Sırala" : "Filter & Sort"}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>{language === "tr" ? "Filtrele & Sırala" : "Filter & Sort"}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label>{language === "tr" ? "Bölge" : "Region"}</Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger data-testid="select-mobile-region">
                        <SelectValue placeholder={language === "tr" ? "Tüm Bölgeler" : "All Regions"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "tr" ? "Tüm Bölgeler" : "All Regions"}</SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === "tr" ? "Kategori" : "Category"}</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger data-testid="select-mobile-category">
                        <SelectValue placeholder={language === "tr" ? "Tüm Kategoriler" : "All Categories"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "tr" ? "Tüm Kategoriler" : "All Categories"}</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>{language === "tr" ? "Sıralama" : "Sort By"}</Label>
                    <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                      <SelectTrigger data-testid="select-mobile-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(sortLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={clearFilters}>
                      {language === "tr" ? "Temizle" : "Clear"}
                    </Button>
                    <Button className="flex-1" onClick={() => setIsFilterOpen(false)}>
                      {language === "tr" ? "Uygula" : "Apply"}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                {language === "tr" ? "Arama" : "Search"}: {searchQuery}
                <button onClick={() => setSearchQuery("")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedRegion && (
              <Badge variant="secondary" className="gap-1">
                {language === "tr" ? "Bölge" : "Region"}: {selectedRegion}
                <button onClick={() => setSelectedRegion("")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="gap-1">
                {language === "tr" ? "Kategori" : "Category"}: {selectedCategory}
                <button onClick={() => setSelectedCategory("")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {sortOption !== "default" && (
              <Badge variant="secondary" className="gap-1">
                {language === "tr" ? "Sıralama" : "Sort"}: {sortLabels[sortOption]}
                <button onClick={() => setSortOption("default")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={clearFilters}>
              {language === "tr" ? "Tümünü Temizle" : "Clear All"}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredActivities.length} {language === "tr" ? "aktivite bulundu" : "activities found"}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
        ) : filteredActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-muted-foreground mb-4">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{t.activities.noResults}</p>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-all">
                {language === "tr" ? "Filtreleri Temizle" : "Clear Filters"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
