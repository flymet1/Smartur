import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Search, Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Loader2, Hash, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../i18n/LanguageContext";
import { getApiUrl } from "../utils";

interface ReservationTrackData {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  date: string;
  time: string;
  quantity: number;
  status: string;
  priceTl: number;
  priceUsd: number;
  currency: string;
  paymentStatus: string;
  hotelName: string | null;
  hasTransfer: boolean;
  activityName: string;
}

interface SearchResult {
  id: number;
  customerName: string;
  date: string;
  time: string;
  quantity: number;
  status: string;
  priceTl: number;
  priceUsd: number;
  currency: string;
  paymentStatus: string;
  hotelName: string | null;
  hasTransfer: boolean;
  activityName: string;
  orderNumber: string | null;
  trackingToken: string | null;
}

export default function PublicTrackReservation() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialToken = urlParams.get("token") || "";

  const { language } = useLanguage();

  const [token, setToken] = useState(initialToken);
  const [searchToken, setSearchToken] = useState(initialToken);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const { data: reservation, isLoading, error } = useQuery<ReservationTrackData>({
    queryKey: [getApiUrl(`/api/website/track?token=${searchToken}`)],
    enabled: !!searchToken,
  });

  const { data: searchResults, isLoading: isSearching, error: searchError } = useQuery<SearchResult[]>({
    queryKey: [getApiUrl(`/api/website/track/search?q=${encodeURIComponent(activeSearchQuery)}`)],
    enabled: activeSearchQuery.length >= 2,
  });

  const handleTokenSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchQuery("");
    setSearchToken(token);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      setSearchToken("");
      setActiveSearchQuery(searchQuery);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    if (result.trackingToken) {
      setToken(result.trackingToken);
      setSearchToken(result.trackingToken);
      setActiveSearchQuery("");
      setSearchQuery("");
    }
  };

  const tr = (trText: string, enText: string) => language === "en" ? enText : trText;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" /> {tr("Onaylandı", "Confirmed")}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"><AlertCircle className="h-3 w-3 mr-1" /> {tr("Beklemede", "Pending")}</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"><XCircle className="h-3 w-3 mr-1" /> {tr("İptal Edildi", "Cancelled")}</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"><CheckCircle className="h-3 w-3 mr-1" /> {tr("Tamamlandı", "Completed")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(language === "en" ? "en-US" : "tr-TR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isSearchMode = activeSearchQuery.length >= 2 && !searchToken;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-track-title">
            {language === "en" ? "Reservation Tracking" : "Rezervasyon Takip"}
          </h1>
          <p className="text-muted-foreground">
            {language === "en" ? "Check the status of your reservation" : "Rezervasyonunuzun durumunu kontrol edin"}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {language === "en" ? "Find Your Reservation" : "Rezervasyonunuzu Bulun"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleTokenSearch} className="space-y-2">
                <Label htmlFor="token" className="flex items-center gap-1.5 text-sm">
                  <Hash className="w-3.5 h-3.5" />
                  {language === "en" ? "Tracking Code" : "Takip Kodu"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={language === "en" ? "Enter your tracking code" : "Takip kodunuzu girin"}
                    className="flex-1"
                    data-testid="input-tracking-token"
                  />
                  <Button type="submit" disabled={!token || isLoading} data-testid="button-search-token">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {language === "en" ? "or" : "veya"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-2">
                <Label htmlFor="search" className="flex items-center gap-1.5 text-sm">
                  <User className="w-3.5 h-3.5" />
                  {language === "en" ? "Order Number or Name" : "Rezervasyon No veya İsim Soyisim"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === "en" ? "e.g. 5001 or John Doe" : "Örn: 5001 veya Ali Yılmaz"}
                    className="flex-1"
                    data-testid="input-search-query"
                  />
                  <Button type="submit" disabled={searchQuery.length < 2 || isSearching} data-testid="button-search-query">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "en" ? "Enter at least 2 characters" : "En az 2 karakter girin"}
                </p>
              </form>
            </CardContent>
          </Card>

          {(isLoading || isSearching) && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">
                  {language === "en" ? "Loading reservation info..." : "Rezervasyon bilgileri yükleniyor..."}
                </p>
              </CardContent>
            </Card>
          )}

          {isSearchMode && !isSearching && searchResults && searchResults.length === 0 && (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === "en" ? "No Reservations Found" : "Rezervasyon Bulunamadı"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "No reservation matching your search was found. Please check and try again."
                    : "Aramanızla eşleşen bir rezervasyon bulunamadı. Lütfen kontrol edip tekrar deneyin."}
                </p>
              </CardContent>
            </Card>
          )}

          {isSearchMode && !isSearching && searchResults && searchResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === "en"
                  ? `${searchResults.length} reservation(s) found. Select to view details:`
                  : `${searchResults.length} rezervasyon bulundu. Detayları görmek için seçin:`}
              </p>
              {searchResults.map((result) => (
                <Card
                  key={result.id}
                  className="hover-elevate cursor-pointer transition-colors"
                  onClick={() => handleSelectResult(result)}
                  data-testid={`card-search-result-${result.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm truncate">{result.activityName}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {result.customerName}
                          </span>
                          {result.orderNumber && (
                            <span className="flex items-center gap-1">
                              <Hash className="w-3.5 h-3.5" />
                              {result.orderNumber}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(result.date + "T00:00:00").toLocaleDateString(language === "en" ? "en-US" : "tr-TR", { day: "numeric", month: "short" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {result.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {result.quantity}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchError && !isSearching && (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === "en" ? "No Reservations Found" : "Rezervasyon Bulunamadı"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "No reservation matching your search was found."
                    : "Aramanızla eşleşen bir rezervasyon bulunamadı."}
                </p>
              </CardContent>
            </Card>
          )}

          {error && !isLoading && !isSearchMode && (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === "en" ? "Reservation Not Found" : "Rezervasyon Bulunamadı"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "No reservation found matching the tracking code you entered. Please check and try again."
                    : "Girdiğiniz takip kodu ile eşleşen bir rezervasyon bulunamadı. Lütfen kodu kontrol edip tekrar deneyin."}
                </p>
              </CardContent>
            </Card>
          )}

          {reservation && !isSearchMode && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>{language === "en" ? "Reservation Details" : "Rezervasyon Detayları"}</CardTitle>
                {getStatusBadge(reservation.status)}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-1">{reservation.activityName}</h3>
                  <p className="text-muted-foreground">{reservation.customerName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{language === "en" ? "Date" : "Tarih"}</p>
                      <p className="font-medium">{formatDate(reservation.date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{language === "en" ? "Time" : "Saat"}</p>
                      <p className="font-medium">{reservation.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{language === "en" ? "Guests" : "Kişi Sayısı"}</p>
                      <p className="font-medium">{reservation.quantity} {language === "en" ? "Guest(s)" : "Kişi"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold">₺</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{language === "en" ? "Total Amount" : "Toplam Tutar"}</p>
                      <p className="font-medium">{reservation.priceTl.toLocaleString("tr-TR")} ₺</p>
                    </div>
                  </div>
                </div>

                {reservation.hotelName && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">{language === "en" ? "Hotel" : "Otel"}</p>
                    <p className="font-medium">{reservation.hotelName}</p>
                    {reservation.hasTransfer && (
                      <Badge variant="secondary" className="mt-2">
                        {language === "en" ? "Transfer Included" : "Transfer Dahil"}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
