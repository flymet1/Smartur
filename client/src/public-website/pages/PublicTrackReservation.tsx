import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Search, Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

export default function PublicTrackReservation() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialToken = urlParams.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [searchToken, setSearchToken] = useState(initialToken);

  const { data: reservation, isLoading, error } = useQuery<ReservationTrackData>({
    queryKey: ["/api/public/reservations", searchToken],
    enabled: !!searchToken,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchToken(token);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Onaylandı</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" /> Beklemede</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> İptal Edildi</Badge>;
      case "completed":
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> Tamamlandı</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tr-TR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Rezervasyon Takip</h1>
          <p className="text-muted-foreground">Rezervasyonunuzun durumunu kontrol edin</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Takip Kodu Girin</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="token">Takip Kodu</Label>
                  <div className="flex gap-2">
                    <Input
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Rezervasyon takip kodunuz"
                      className="flex-1"
                      data-testid="input-tracking-token"
                    />
                    <Button type="submit" disabled={!token || isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {isLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Rezervasyon bilgileri yükleniyor...</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">Rezervasyon Bulunamadı</h3>
                <p className="text-muted-foreground">
                  Girdiğiniz takip kodu ile eşleşen bir rezervasyon bulunamadı.
                  Lütfen kodu kontrol edip tekrar deneyin.
                </p>
              </CardContent>
            </Card>
          )}

          {reservation && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rezervasyon Detayları</CardTitle>
                {getStatusBadge(reservation.status)}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-1">{reservation.activityName}</h3>
                  <p className="text-muted-foreground">{reservation.customerName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tarih</p>
                      <p className="font-medium">{formatDate(reservation.date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saat</p>
                      <p className="font-medium">{reservation.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kişi Sayısı</p>
                      <p className="font-medium">{reservation.quantity} Kişi</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">₺</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                      <p className="font-medium">{reservation.priceTl} ₺</p>
                    </div>
                  </div>
                </div>

                {reservation.hotelName && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Otel</p>
                    <p className="font-medium">{reservation.hotelName}</p>
                    {reservation.hasTransfer && (
                      <Badge variant="secondary" className="mt-2">Transfer Dahil</Badge>
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
