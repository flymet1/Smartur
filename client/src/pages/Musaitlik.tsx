import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Check,
  X,
  AlertCircle,
  Send,
  Loader2
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePermissions, PERMISSION_KEYS } from "@/hooks/use-permissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Activity } from "@shared/schema";

interface CapacitySlot {
  id: number;
  activityId: number;
  date: string;
  time: string;
  totalSlots: number;
  bookedSlots: number;
  isVirtual?: boolean;
}

interface MonthlyStats {
  month: number;
  year: number;
  dailyStats: Record<string, { totalSlots: number; bookedSlots: number; occupancy: number }>;
}

export default function Musaitlik() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedActivity, setSelectedActivity] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<CapacitySlot | null>(null);
  const [requestForm, setRequestForm] = useState({
    customerName: "",
    customerPhone: "",
    guests: 1,
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRequestReservation = hasPermission(PERMISSION_KEYS.RESERVATIONS_REQUEST);

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  const { data: monthlyStats } = useQuery<MonthlyStats>({
    queryKey: ['/api/capacity/monthly', currentMonth.getMonth(), currentMonth.getFullYear(), selectedActivity],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: String(currentMonth.getMonth()),
        year: String(currentMonth.getFullYear())
      });
      if (selectedActivity !== "all") {
        params.append("activityId", selectedActivity);
      }
      const res = await fetch(`/api/capacity/monthly?${params}`, { credentials: 'include' });
      return res.json();
    }
  });

  const { data: dailyCapacity = [] } = useQuery<CapacitySlot[]>({
    queryKey: ['/api/capacity', selectedDate, selectedActivity],
    enabled: !!selectedDate,
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate! });
      if (selectedActivity !== "all") {
        params.append("activityId", selectedActivity);
      }
      const res = await fetch(`/api/capacity?${params}`, { credentials: 'include' });
      return res.json();
    }
  });

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days: Date[] = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    let day = currentMonth.getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentMonth]);

  const getAvailabilityStatus = (date: Date): 'available' | 'limited' | 'full' | 'no-data' => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const stats = monthlyStats?.dailyStats?.[dateStr];
    
    if (!stats || stats.totalSlots === 0) return 'no-data';
    
    const availableSlots = stats.totalSlots - stats.bookedSlots;
    const availablePercent = (availableSlots / stats.totalSlots) * 100;
    
    if (availablePercent === 0) return 'full';
    if (availablePercent < 30) return 'limited';
    return 'available';
  };

  const getActivityName = (activityId: number): string => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.name || "Bilinmiyor";
  };

  const handleSlotClick = (slot: CapacitySlot) => {
    const availableSlots = slot.totalSlots - slot.bookedSlots;
    if (availableSlots <= 0) {
      toast({
        title: "Dolu",
        description: "Bu saat icin musait yer bulunmuyor.",
        variant: "destructive"
      });
      return;
    }
    
    if (canRequestReservation) {
      setSelectedSlot(slot);
      setShowRequestDialog(true);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedSlot || !requestForm.customerName || !requestForm.customerPhone) {
      toast({
        title: "Hata",
        description: "Lutfen zorunlu alanlari doldurun.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/reservation-requests", {
        activityId: selectedSlot.activityId,
        date: selectedSlot.date,
        time: selectedSlot.time,
        customerName: requestForm.customerName,
        customerPhone: requestForm.customerPhone,
        guests: requestForm.guests,
        notes: requestForm.notes
      });

      toast({
        title: "Talep Gonderildi",
        description: "Rezervasyon talebiniz alindi. En kisa surede size donulecektir."
      });

      setShowRequestDialog(false);
      setSelectedSlot(null);
      setRequestForm({ customerName: "", customerPhone: "", guests: 1, notes: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/capacity'] });
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message || "Talep gonderilemedi.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 xl:ml-64 p-4 pt-16 xl:pt-20 xl:px-6 xl:pb-6 pb-24">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Musaitlik</h1>
              <p className="text-muted-foreground text-sm">
                Aktivite musaitlik durumunu goruntuleyebilir ve rezervasyon talebi olusturabilirsiniz.
              </p>
            </div>
            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger className="w-48" data-testid="select-activity-filter">
                <SelectValue placeholder="Aktivite Sec" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Aktiviteler</SelectItem>
                {activities.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Musait</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Sinirli</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Dolu</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-muted-foreground">Veri Yok</span>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(currentMonth, 'MMMM yyyy', { locale: tr })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                  data-testid="button-today"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {daysInMonth.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const status = getAvailabilityStatus(day);
                  const isSelected = selectedDate === dateStr;
                  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                  const isPast = day < new Date(new Date().setHours(0,0,0,0));
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isPast && setSelectedDate(dateStr)}
                      disabled={isPast}
                      className={`
                        aspect-square flex flex-col items-center justify-center rounded-md transition-all
                        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                        ${isPast ? 'opacity-40 cursor-not-allowed' : 'hover-elevate cursor-pointer'}
                        ${isToday ? 'font-bold' : ''}
                      `}
                      data-testid={`day-${dateStr}`}
                    >
                      <span className="text-sm">{day.getDate()}</span>
                      <div className={`
                        w-2 h-2 rounded-full mt-1
                        ${status === 'available' ? 'bg-green-500' : ''}
                        ${status === 'limited' ? 'bg-yellow-500' : ''}
                        ${status === 'full' ? 'bg-red-500' : ''}
                        ${status === 'no-data' ? 'bg-muted' : ''}
                      `} />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(new Date(selectedDate), 'd MMMM yyyy', { locale: tr })} - Saatler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyCapacity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Bu tarih icin henuz kapasite tanimlanmamis.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dailyCapacity.map(slot => {
                      const availableSlots = slot.totalSlots - slot.bookedSlots;
                      const isFull = availableSlots <= 0;
                      
                      return (
                        <div
                          key={slot.id || `${slot.activityId}-${slot.time}`}
                          className={`
                            p-4 rounded-md border transition-all
                            ${isFull ? 'opacity-60' : 'hover-elevate cursor-pointer'}
                          `}
                          onClick={() => !isFull && handleSlotClick(slot)}
                          data-testid={`slot-${slot.activityId}-${slot.time}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{slot.time}</span>
                            {isFull ? (
                              <Badge variant="destructive" className="text-xs">
                                <X className="h-3 w-3 mr-1" />
                                Dolu
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                {availableSlots} Yer
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getActivityName(slot.activityId)}
                          </p>
                          {canRequestReservation && !isFull && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSlotClick(slot);
                              }}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Talep Olustur
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rezervasyon Talebi</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm">
                <p><strong>Aktivite:</strong> {getActivityName(selectedSlot.activityId)}</p>
                <p><strong>Tarih:</strong> {format(new Date(selectedSlot.date), 'd MMMM yyyy', { locale: tr })}</p>
                <p><strong>Saat:</strong> {selectedSlot.time}</p>
                <p><strong>Musait Yer:</strong> {selectedSlot.totalSlots - selectedSlot.bookedSlots}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Musteri Adi *</Label>
                  <Input
                    id="customerName"
                    value={requestForm.customerName}
                    onChange={(e) => setRequestForm({ ...requestForm, customerName: e.target.value })}
                    placeholder="Musteri adi"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Telefon *</Label>
                  <Input
                    id="customerPhone"
                    value={requestForm.customerPhone}
                    onChange={(e) => setRequestForm({ ...requestForm, customerPhone: e.target.value })}
                    placeholder="+90..."
                    data-testid="input-customer-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="guests">Kisi Sayisi</Label>
                  <Input
                    id="guests"
                    type="number"
                    min={1}
                    value={requestForm.guests}
                    onChange={(e) => setRequestForm({ ...requestForm, guests: parseInt(e.target.value) || 1 })}
                    data-testid="input-guests"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Not</Label>
                  <Textarea
                    id="notes"
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                    placeholder="Ek bilgiler..."
                    data-testid="input-notes"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)} data-testid="button-cancel">
              Iptal
            </Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmitting} data-testid="button-submit-request">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Talep Gonder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
