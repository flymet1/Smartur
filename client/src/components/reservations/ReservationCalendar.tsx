import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Reservation, Activity, PackageTour } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/reservations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
    },
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

  const getStatusBadge = (status: string, reservationId: number) => {
    const statusConfig = {
      confirmed: { label: "Onayli", className: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" },
      pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200" },
      cancelled: { label: "Iptal", className: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" },
    };
    const current = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "" };
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge 
            className={`${current.className} cursor-pointer flex items-center gap-1`}
            data-testid={`button-calendar-status-${reservationId}`}
          >
            {current.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'pending' })}
            className="text-yellow-700"
            data-testid={`calendar-status-pending-${reservationId}`}
          >
            Beklemede
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'confirmed' })}
            className="text-green-700"
            data-testid={`calendar-status-confirmed-${reservationId}`}
          >
            Onayli
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'cancelled' })}
            className="text-red-700"
            data-testid={`calendar-status-cancelled-${reservationId}`}
          >
            Iptal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
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
              (() => {
                // Group reservations by order number or package tour + customer
                const groups: Record<string, Reservation[]> = {};
                const standalone: Reservation[] = [];
                
                selectedReservations.forEach(res => {
                  if (res.orderNumber) {
                    // Group by order number
                    const key = `order_${res.orderNumber}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(res);
                  } else if (res.packageTourId) {
                    // Group by package tour + customer info
                    const key = `pkg_${res.packageTourId}_${res.customerName}_${res.customerPhone}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(res);
                  } else {
                    standalone.push(res);
                  }
                });
                
                // Render grouped reservations
                const groupEntries = Object.entries(groups).filter(([_, items]) => items.length > 1);
                const ungrouped = [
                  ...standalone,
                  ...Object.entries(groups)
                    .filter(([_, items]) => items.length === 1)
                    .flatMap(([_, items]) => items)
                ];
                
                return (
                  <>
                    {/* Grouped package/order reservations */}
                    {groupEntries.map(([groupKey, items]) => {
                      const first = items[0];
                      const packageName = getPackageTourName(first.packageTourId);
                      return (
                        <div 
                          key={groupKey}
                          className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4 text-purple-600" />
                                <span className="font-semibold text-purple-700 dark:text-purple-300">
                                  {packageName || "Paket Siparis"}
                                </span>
                                {first.orderNumber && (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    #{first.orderNumber}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium">{first.customerName}</p>
                              <p className="text-sm text-muted-foreground">{first.customerPhone}</p>
                            </div>
                            {getStatusBadge(first.status || 'pending', first.id)}
                          </div>
                          <div className="space-y-2 pl-2 border-l-2 border-purple-300 dark:border-purple-600">
                            {items.map((res, idx) => (
                              <div key={res.id} className="flex justify-between items-center text-sm bg-background/50 rounded p-2">
                                <span className="text-muted-foreground">
                                  {res.time} • {res.quantity} Kisi
                                </span>
                                <span className="font-medium">{getActivityName(res.activityId)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700 flex justify-between text-sm">
                            <span className="text-muted-foreground">{items.length} aktivite</span>
                            <span className="font-medium">{items.reduce((sum, r) => sum + r.quantity, 0)} Kisi toplam</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Ungrouped single reservations */}
                    {ungrouped.map((res) => (
                      <div 
                        key={res.id} 
                        className="p-4 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{res.customerName}</p>
                              {res.orderNumber && (
                                <Badge variant="outline" className="font-mono text-xs">
                                  #{res.orderNumber}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{res.customerPhone}</p>
                          </div>
                          {getStatusBadge(res.status || 'pending', res.id)}
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
                    ))}
                  </>
                );
              })()
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
