import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ExternalLink } from "lucide-react";
import { SEO } from "../components/shared/SEO";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";

interface PackageTour {
  id: number;
  name: string;
  description: string | null;
  price: number;
  priceUsd: number;
  reservationLink: string | null;
  reservationLinkEn: string | null;
  faq: Array<{ question: string; answer: string }>;
}

export default function PublicPackageTours() {
  const { t, language } = useLanguage();

  const { data: packageTours, isLoading } = useQuery<PackageTour[]>({
    queryKey: [getApiUrl(`/api/website/package-tours?lang=${language}`)],
  });

  const formatPrice = (priceTL: number, priceUsd: number) => {
    if (language === "en" && priceUsd > 0) {
      return `$${priceUsd}`;
    }
    return `${priceTL.toLocaleString("tr-TR")} ₺`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!packageTours || packageTours.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {language === "en" ? "No Package Tours" : "Paket Tur Bulunamadı"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en"
            ? "There are no package tours available at the moment."
            : "Şu anda mevcut paket tur bulunmamaktadır."}
        </p>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={language === "en" ? "Package Tours" : "Paket Turlar"}
        description={
          language === "en"
            ? "Explore our package tour offerings with multiple activities combined"
            : "Birden fazla aktiviteyi bir arada sunan paket tur seçeneklerimizi keşfedin"
        }
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Package className="w-8 h-8" />
            {language === "en" ? "Package Tours" : "Paket Turlar"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === "en"
              ? "Discover our carefully curated package tours combining multiple experiences"
              : "Birden fazla deneyimi bir araya getiren özenle hazırlanmış paket turlarımızı keşfedin"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packageTours.map((tour) => (
            <Card
              key={tour.id}
              className="overflow-visible hover-elevate"
              data-testid={`card-package-tour-${tour.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="text-xl font-semibold line-clamp-2">{tour.name}</h2>
                  <Badge variant="secondary" className="shrink-0">
                    <Package className="w-3 h-3 mr-1" />
                    {language === "en" ? "Package" : "Paket"}
                  </Badge>
                </div>

                {tour.description && (
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                    {tour.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-4 border-t">
                  <div className="text-lg font-bold">
                    {formatPrice(tour.price, tour.priceUsd)}
                  </div>

                  {(tour.reservationLink || tour.reservationLinkEn) && (
                    <Button
                      size="sm"
                      asChild
                      data-testid={`button-reserve-${tour.id}`}
                    >
                      <a
                        href={language === "en" && tour.reservationLinkEn ? tour.reservationLinkEn : tour.reservationLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        {language === "en" ? "Reserve" : "Rezervasyon"}
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
