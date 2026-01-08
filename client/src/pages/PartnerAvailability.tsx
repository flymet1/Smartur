import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Users, Building2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface PartnerActivity {
  id: number;
  name: string;
  description: string | null;
  price: number;
  priceUsd: number;
  durationMinutes: number;
  color: string;
  defaultTimes: string;
  capacities: {
    date: string;
    time: string;
    totalSlots: number;
    bookedSlots: number;
    availableSlots: number;
  }[];
}

interface PartnerData {
  partnerTenantId: number;
  partnerTenantName: string;
  activities: PartnerActivity[];
}

export default function PartnerAvailability() {
  const today = new Date();
  const [startDate, setStartDate] = useState(today.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);
    return weekLater.toISOString().split('T')[0];
  });

  const { data: partnerData, isLoading, refetch, isFetching } = useQuery<PartnerData[]>({
    queryKey: [`/api/partner-shared-availability?startDate=${startDate}&endDate=${endDate}`],
  });

  const navigateDates = (days: number) => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + days);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + days);
    setStartDate(newStart.toISOString().split('T')[0]);
    setEndDate(newEnd.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  const getAvailabilityColor = (available: number, total: number) => {
    if (available === 0) return 'bg-red-500/20 text-red-700 dark:text-red-400';
    const ratio = available / total;
    if (ratio > 0.5) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (ratio > 0.2) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
  };

  const groupCapacitiesByDate = (capacities: PartnerActivity['capacities']) => {
    const grouped: Record<string, typeof capacities> = {};
    capacities.forEach(cap => {
      if (!grouped[cap.date]) grouped[cap.date] = [];
      grouped[cap.date].push(cap);
    });
    return grouped;
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Partner Musaitlikleri
          </h1>
          <p className="text-muted-foreground mt-1">Bagli oldugunuz acentalarin paylasilan aktivitelerinin musaitligi</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDates(-7)}
                data-testid="button-prev-week"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                  data-testid="input-start-date"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                  data-testid="input-end-date"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDates(7)}
                data-testid="button-next-week"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !partnerData || partnerData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Paylasilan Aktivite Yok</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Henuz bagli oldugunuz partner acentalar aktivitelerini sizinle paylasmamis 
                veya henuz bir partner acentaya baglanmadiniz.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/settings?tab=partners">Partnerleri Yonet</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {partnerData.map((partner) => (
              <Card key={partner.partnerTenantId} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {partner.partnerTenantName}
                  </CardTitle>
                  <CardDescription>
                    {partner.activities.length} aktivite paylasiliyor
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {partner.activities.map((activity) => {
                      const grouped = groupCapacitiesByDate(activity.capacities);
                      const dates = Object.keys(grouped).sort();
                      
                      return (
                        <div key={activity.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-medium flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: activity.color === 'blue' ? '#3b82f6' : 
                                           activity.color === 'green' ? '#22c55e' :
                                           activity.color === 'purple' ? '#a855f7' :
                                           activity.color === 'orange' ? '#f97316' :
                                           activity.color === 'pink' ? '#ec4899' :
                                           activity.color === 'cyan' ? '#06b6d4' :
                                           activity.color === 'red' ? '#ef4444' :
                                           activity.color === 'yellow' ? '#eab308' : '#3b82f6' 
                                  }}
                                />
                                {activity.name}
                              </h4>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="mb-1">
                                {activity.price.toLocaleString('tr-TR')} TL
                              </Badge>
                              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                {activity.durationMinutes} dk
                              </p>
                            </div>
                          </div>

                          {dates.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              Bu tarih araliginda kapasite bilgisi yok
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                              {dates.map(date => {
                                const caps = grouped[date];
                                const totalAvailable = caps.reduce((sum, c) => sum + c.availableSlots, 0);
                                const totalSlots = caps.reduce((sum, c) => sum + c.totalSlots, 0);
                                
                                return (
                                  <div 
                                    key={date} 
                                    className="border rounded-md p-2 text-center"
                                    data-testid={`capacity-${date}`}
                                  >
                                    <p className="text-xs font-medium mb-1">{formatDate(date)}</p>
                                    <div className="space-y-1">
                                      {caps.map((cap, idx) => (
                                        <div 
                                          key={idx}
                                          className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(cap.availableSlots, cap.totalSlots)}`}
                                        >
                                          <span className="font-medium">{cap.time}</span>
                                          <div className="flex items-center justify-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {cap.availableSlots}/{cap.totalSlots}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className={`mt-1 text-xs font-medium px-2 py-0.5 rounded ${getAvailabilityColor(totalAvailable, totalSlots)}`}>
                                      Toplam: {totalAvailable}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
