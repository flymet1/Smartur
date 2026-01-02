import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Reservation, Activity, PackageTour } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

interface ReservationCalendarProps {
  reservations: Reservation[];
}

export function ReservationCalendar({ reservations }: ReservationCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  const { data: packageTours = [] } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });

  const getActivityName = (activityId: number | null) => {
    if (!activityId) return "Bilinmiyor";
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };

  const getPackageTourName = (packageTourId: number | null) => {
    if (!packageTourId) return null;
    return packageTours.find(p => p.id === packageTourId)?.name || null;
  };
  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;

  const getReservationsForDate = (date: string) => 
    reservations.filter(r => r.date === date);

  const selectedReservations = formattedDate 
    ? getReservationsForDate(formattedDate) 
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Onaylı</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Beklemede</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">İptal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDatesWithReservations = () => {
    const dates = new Set<string>();
    reservations.forEach(r => dates.add(r.date));
    return dates;
  };

  const datesWithReservations = getDatesWithReservations();

  // Generate summary by activity and hour
  const generateSummary = () => {
    if (selectedReservations.length === 0) return null;
    
    // Group by activity
    const byActivity: Record<number, { name: string; byHour: Record<string, number>; total: number }> = {};
    
    selectedReservations.forEach(res => {
      const actId = res.activityId || 0;
      const actName = getActivityName(actId);
      
      if (!byActivity[actId]) {
        byActivity[actId] = { name: actName, byHour: {}, total: 0 };
      }
      
      const time = res.time || "00:00";
      byActivity[actId].byHour[time] = (byActivity[actId].byHour[time] || 0) + res.quantity;
      byActivity[actId].total += res.quantity;
    });
    
    const grandTotal = Object.values(byActivity).reduce((sum, a) => sum + a.total, 0);
    
    return { byActivity, grandTotal };
  };
  
  const summary = generateSummary();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="p-4">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            return !datesWithReservations.has(dateStr);
          }}
          className="w-full"
        />
      </Card>

      <div className="md:col-span-2 space-y-4">
        {summary && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full"></span>
              Gun Ozeti - {formattedDate ? format(new Date(formattedDate), "d MMMM", { locale: tr }) : ""}
            </h4>
            <div className="space-y-3">
              {Object.entries(summary.byActivity).map(([actId, data]) => (
                <div key={actId} className="bg-card rounded-lg p-3 border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{data.name}</span>
                    <Badge variant="secondary">{data.total} kisi</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.byHour)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([time, count]) => (
                        <Badge key={time} variant="outline" className="text-xs">
                          {time}: {count} kisi
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="font-semibold">Toplam</span>
                <Badge className="bg-primary text-primary-foreground">{summary.grandTotal} kisi</Badge>
              </div>
            </div>
          </Card>
        )}
        
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold">
              {formattedDate ? format(new Date(formattedDate), "d MMMM yyyy", { locale: tr }) : "Tarih seçin"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedReservations.length} rezervasyon
            </p>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {selectedReservations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Bu tarihte rezervasyon bulunmuyor.
              </div>
            ) : (
              selectedReservations.map((res) => (
                <div 
                  key={res.id} 
                  className="p-4 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{res.customerName}</p>
                      <p className="text-sm text-muted-foreground">{res.customerPhone}</p>
                    </div>
                    {getStatusBadge(res.status || 'pending')}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {res.time} • {res.quantity} Kisi
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getActivityName(res.activityId)}</span>
                      {res.packageTourId && (
                        <Badge variant="outline" className="text-xs text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-900/20 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {getPackageTourName(res.packageTourId) || 'Paket'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
