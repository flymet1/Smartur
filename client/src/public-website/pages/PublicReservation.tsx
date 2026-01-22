import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { ChevronLeft, Calendar, Clock, Users, CheckCircle, Loader2, Plus, Minus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PublicActivity, AvailabilitySlot } from "../types";
import { getApiUrl, isPreviewMode } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";

interface SelectedExtra {
  name: string;
  priceTl: number;
  priceUsd: number;
  quantity: number;
}

export default function PublicReservation() {
  const { id } = useParams<{ id: string }>();
  const activityId = parseInt(id || "0");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { getLocalizedPath } = useLanguage();

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    date: "",
    time: "",
    quantity: 1,
    hotelName: "",
    hasTransfer: false,
    notes: "",
  });

  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [trackingToken, setTrackingToken] = useState("");

  const { data: activity, isLoading: activityLoading } = useQuery<PublicActivity>({
    queryKey: [getApiUrl(`/api/website/activities/${activityId}`)],
    enabled: activityId > 0,
  });

  const { data: availability } = useQuery<AvailabilitySlot[]>({
    queryKey: [getApiUrl(`/api/website/availability?activityId=${activityId}&date=${formData.date}`)],
    enabled: !!formData.date && activityId > 0,
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: typeof formData & { extras?: SelectedExtra[] }) => {
      const response = await apiRequest("POST", getApiUrl("/api/website/reservations"), {
        activityId,
        ...data,
        quantity: Number(data.quantity),
        selectedExtras: data.extras || [],
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      setTrackingToken(data.trackingToken);
      toast({
        title: "Rezervasyon Oluşturuldu",
        description: "Rezervasyonunuz başarıyla alındı.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Rezervasyon oluşturulamadı.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReservationMutation.mutate({ ...formData, extras: selectedExtras });
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "quantity") {
      setSelectedExtras((prev) =>
        prev.map((e) => ({ ...e, quantity: Math.min(e.quantity, value) }))
      );
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const toggleExtra = (extra: { name: string; priceTl: number; priceUsd: number }) => {
    setSelectedExtras((prev) => {
      const existing = prev.find((e) => e.name === extra.name);
      if (existing) {
        return prev.filter((e) => e.name !== extra.name);
      }
      return [...prev, { ...extra, quantity: formData.quantity }];
    });
  };

  const updateExtraQuantity = (extraName: string, delta: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) =>
        e.name === extraName
          ? { ...e, quantity: Math.max(1, Math.min(e.quantity + delta, formData.quantity)) }
          : e
      )
    );
  };

  const calculateExtrasTotal = () => {
    return selectedExtras.reduce((sum, extra) => sum + extra.priceTl * extra.quantity, 0);
  };

  const getAvailableTimes = () => {
    if (!activity?.defaultTimes) return [];
    
    if (availability && availability.length > 0) {
      return availability
        .filter((slot) => slot.available > 0)
        .map((slot) => slot.time);
    }
    
    return activity.defaultTimes;
  };

  if (activityLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Aktivite Bulunamadı</h1>
          <Link href={getLocalizedPath("/aktiviteler")}>
            <Button>Aktivitelere Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Rezervasyon Başarılı!</h2>
              <p className="text-muted-foreground">
                Rezervasyonunuz başarıyla oluşturuldu. Size en kısa sürede dönüş yapılacaktır.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg mb-6">
              <p className="text-sm text-muted-foreground mb-1">Takip Kodunuz</p>
              <p className="font-mono font-bold text-lg">{trackingToken}</p>
            </div>

            <div className="space-y-2">
              <Link href={getLocalizedPath(`/takip?token=${trackingToken}`)}>
                <Button className="w-full">Rezervasyonumu Takip Et</Button>
              </Link>
              <Link href={getLocalizedPath("/")}>
                <Button variant="outline" className="w-full">Ana Sayfaya Dön</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const basePrice = activity.price * formData.quantity;
  const extrasTotal = calculateExtrasTotal();
  const totalPrice = basePrice + extrasTotal;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href={getLocalizedPath(`/aktivite/${activity.id}`)}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ChevronLeft className="h-4 w-4" />
            Aktiviteye Dön
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Rezervasyon Yap</CardTitle>
              <CardDescription>
                {activity.name} için rezervasyon oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.durationMinutes} dakika
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{activity.price} ₺</p>
                      <p className="text-sm text-muted-foreground">kişi başı</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customerName">Ad Soyad *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => updateField("customerName", e.target.value)}
                      required
                      data-testid="input-customer-name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="customerPhone">Telefon *</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => updateField("customerPhone", e.target.value)}
                      required
                      data-testid="input-customer-phone"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="customerEmail">E-posta</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => updateField("customerEmail", e.target.value)}
                      data-testid="input-customer-email"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Tarih *</Label>
                      <Input
                        id="date"
                        type="date"
                        min={getMinDate()}
                        value={formData.date}
                        onChange={(e) => updateField("date", e.target.value)}
                        required
                        data-testid="input-date"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="time">Saat *</Label>
                      <Select
                        value={formData.time}
                        onValueChange={(value) => updateField("time", value)}
                        disabled={!formData.date}
                      >
                        <SelectTrigger data-testid="select-time">
                          <SelectValue placeholder="Saat seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableTimes().map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Kişi Sayısı *</Label>
                    <Select
                      value={String(formData.quantity)}
                      onValueChange={(value) => updateField("quantity", parseInt(value))}
                    >
                      <SelectTrigger data-testid="select-quantity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            {num} Kişi
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activity.hasFreeHotelTransfer && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasTransfer"
                          checked={formData.hasTransfer}
                          onCheckedChange={(checked) => updateField("hasTransfer", checked)}
                          data-testid="checkbox-transfer"
                        />
                        <Label htmlFor="hasTransfer">Otel transferi istiyorum (ücretsiz)</Label>
                      </div>

                      {formData.hasTransfer && (
                        <div className="grid gap-2">
                          <Label htmlFor="hotelName">Otel Adı</Label>
                          <Input
                            id="hotelName"
                            value={formData.hotelName}
                            onChange={(e) => updateField("hotelName", e.target.value)}
                            placeholder="Konakladığınız otel adı"
                            data-testid="input-hotel-name"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notlar</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="Eklemek istediğiniz notlar..."
                      data-testid="input-notes"
                    />
                  </div>

                  {activity.extras && activity.extras.length > 0 && (
                    <div className="grid gap-3">
                      <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Ekstra Hizmetler
                      </Label>
                      <div className="space-y-3">
                        {activity.extras.map((extra, idx) => {
                          const isSelected = selectedExtras.some((e) => e.name === extra.name);
                          const selectedExtra = selectedExtras.find((e) => e.name === extra.name);
                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg border-2 transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id={`extra-${idx}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleExtra(extra)}
                                  data-testid={`checkbox-extra-${idx}`}
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`extra-${idx}`}
                                    className="font-medium cursor-pointer"
                                  >
                                    {extra.name}
                                  </Label>
                                  {extra.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {extra.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-primary">+{extra.priceTl} ₺</span>
                                  {extra.priceUsd > 0 && (
                                    <p className="text-xs text-muted-foreground">${extra.priceUsd}</p>
                                  )}
                                </div>
                              </div>
                              {isSelected && selectedExtra && (
                                <div className="mt-3 flex items-center justify-between border-t pt-3">
                                  <span className="text-sm text-muted-foreground">Adet:</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateExtraQuantity(extra.name, -1)}
                                      disabled={selectedExtra.quantity <= 1}
                                      data-testid={`button-extra-minus-${idx}`}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center font-medium">
                                      {selectedExtra.quantity}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateExtraQuantity(extra.name, 1)}
                                      disabled={selectedExtra.quantity >= formData.quantity}
                                      data-testid={`button-extra-plus-${idx}`}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {activity.name} x {formData.quantity} kişi
                    </span>
                    <span>{basePrice.toLocaleString()} ₺</span>
                  </div>

                  {selectedExtras.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Seçilen Ekstralar:</p>
                        {selectedExtras.map((extra, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {extra.name} x {extra.quantity}
                            </span>
                            <span>+{(extra.priceTl * extra.quantity).toLocaleString()} ₺</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">Toplam Tutar</span>
                    <span className="text-2xl font-bold text-primary">{totalPrice.toLocaleString()} ₺</span>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={createReservationMutation.isPending}
                    data-testid="button-submit-reservation"
                  >
                    {createReservationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        İşleniyor...
                      </>
                    ) : (
                      "Rezervasyon Yap"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
