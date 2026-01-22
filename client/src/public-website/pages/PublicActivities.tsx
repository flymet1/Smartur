import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCard } from "../components/ActivityCard";
import type { PublicActivity } from "../types";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";

export default function PublicActivities() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialSearch = urlParams.get("search") || "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const { language } = useLanguage();

  const { data: activities, isLoading } = useQuery<PublicActivity[]>({
    queryKey: [getApiUrl(`/api/website/activities?lang=${language}`)],
  });

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

    return result;
  }, [activities, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
  };

  const hasActiveFilters = !!searchQuery;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-activities-title">
            Aktiviteler
          </h1>
          <p className="text-muted-foreground">Tüm turlarımızı ve aktivitelerimizi keşfedin</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Aktivite ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-activities"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Arama: {searchQuery}
                <button onClick={() => setSearchQuery("")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Filtreleri Temizle
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredActivities.length} aktivite bulundu
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
              <p className="text-lg">Aktivite bulunamadı</p>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-all">
                Filtreleri Temizle
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
