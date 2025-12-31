import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Reservation } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ReservationCalendarProps {
  reservations: Reservation[];
}

export function ReservationCalendar({ reservations }: ReservationCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

      <div className="md:col-span-2">
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
                      {res.time} • {res.quantity} Kişi
                    </span>
                    <span className="font-medium">Aktivite #{res.activityId}</span>
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
