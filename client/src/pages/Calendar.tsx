import { Sidebar } from "@/components/layout/Sidebar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState, useMemo } from "react";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { useCapacity, useCreateCapacity } from "@/hooks/use-capacity";
import { useActivities } from "@/hooks/use-activities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Calendar, Users, Clock, TrendingUp, TrendingDown, Filter, CalendarDays, LayoutGrid, Trash2, ClipboardList, ChevronLeft, ChevronRight, Minus, Share2, FileText, AlertTriangle, BarChart3, Download, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Capacity } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CapacitySlot } from "@/hooks/use-capacity";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";

type ViewMode = 'day' | 'week' | 'month' | 'timeline';

function getOccupancyColor(occupancy: number): string {
  if (occupancy >= 100) return 'bg-red-600 dark:bg-red-700';
  if (occupancy >= 80) return 'bg-orange-500 dark:bg-orange-600';
  if (occupancy >= 50) return 'bg-yellow-500 dark:bg-yellow-600';
  if (occupancy > 0) return 'bg-green-500 dark:bg-green-600';
  return 'bg-muted';
}

function getOccupancyTextColor(occupancy: number): string {
  if (occupancy >= 100) return 'text-red-600 dark:text-red-400';
  if (occupancy >= 80) return 'text-orange-600 dark:text-orange-400';
  if (occupancy >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue }: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: any; 
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trendValue && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full shrink-0 ${trend === 'up' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : trend === 'down' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted'}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyCalendarView({ 
  date, 
  onDateSelect,
  monthlyData,
  onMonthChange 
}: { 
  date: Date; 
  onDateSelect: (date: Date) => void;
  monthlyData?: Record<string, { totalSlots: number; bookedSlots: number; occupancy: number }>;
  onMonthChange: (date: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startPadding = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  const paddedDays = Array(startPadding).fill(null).concat(days);
  
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(date, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold">{format(date, 'MMMM yyyy', { locale: tr })}</h3>
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(date, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {paddedDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          
          const dateStr = format(day, 'yyyy-MM-dd');
          const stats = monthlyData?.[dateStr];
          const occupancy = stats?.occupancy || 0;
          const isSelected = format(date, 'yyyy-MM-dd') === dateStr;
          const isTodayDate = isToday(day);
          
          return (
            <Tooltip key={dateStr}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDateSelect(day)}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center text-sm transition-all relative ${
                    isSelected 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : ''
                  } ${isTodayDate ? 'font-bold' : ''}`}
                  data-testid={`button-month-day-${dateStr}`}
                >
                  <span className={isTodayDate ? 'text-primary' : ''}>{format(day, 'd')}</span>
                  {stats && stats.totalSlots > 0 && (
                    <div className={`w-3 h-1.5 rounded-full mt-1 ${getOccupancyColor(occupancy)}`} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{format(day, 'd MMMM', { locale: tr })}</p>
                  {stats ? (
                    <>
                      <p className="text-xs">Doluluk: %{occupancy}</p>
                      <p className="text-xs">{stats.bookedSlots}/{stats.totalSlots} kişi</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Veri yok</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>%0-50</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>%50-80</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>%80-100</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-600" />
          <span>%100</span>
        </div>
      </div>
    </div>
  );
}

function WeekView({ selectedDate, onDateSelect }: { selectedDate: Date; onDateSelect: (date: Date) => void }) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isSelected = format(selectedDate, "yyyy-MM-dd") === dateStr;
        const isTodayDate = format(new Date(), "yyyy-MM-dd") === dateStr;
        
        return (
          <button
            key={dateStr}
            onClick={() => onDateSelect(day)}
            className={`p-3 rounded-lg text-center transition-all ${
              isSelected 
                ? 'bg-primary text-primary-foreground' 
                : isTodayDate 
                  ? 'bg-primary/10 border-2 border-primary' 
                  : 'bg-card border hover-elevate'
            }`}
            data-testid={`button-day-${dateStr}`}
          >
            <p className="text-xs font-medium">{format(day, "EEE", { locale: tr })}</p>
            <p className="text-lg font-bold mt-1">{format(day, "d")}</p>
          </button>
        );
      })}
    </div>
  );
}

function TimelineView({ capacity, activities, onCreateReservation }: { 
  capacity: CapacitySlot[]; 
  activities: any[];
  onCreateReservation: (slot: CapacitySlot) => void;
}) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  
  const getActivityName = (id: number) => activities?.find(a => a.id === id)?.name || "Bilinmeyen";
  
  const slotsByActivity = useMemo(() => {
    const grouped: Record<number, CapacitySlot[]> = {};
    capacity.forEach(slot => {
      if (!grouped[slot.activityId]) grouped[slot.activityId] = [];
      grouped[slot.activityId].push(slot);
    });
    return grouped;
  }, [capacity]);
  
  const uniqueActivities = Object.keys(slotsByActivity).map(Number);
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid gap-2" style={{ gridTemplateColumns: `150px repeat(${hours.length}, 1fr)` }}>
          <div className="font-medium text-sm text-muted-foreground">Aktivite</div>
          {hours.map(hour => (
            <div key={hour} className="text-center text-xs text-muted-foreground">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
          
          {uniqueActivities.map(activityId => (
            <>
              <div key={`act-${activityId}`} className="text-sm font-medium truncate py-2">
                {getActivityName(activityId)}
              </div>
              {hours.map(hour => {
                const hourStr = `${String(hour).padStart(2, '0')}:`;
                const slots = slotsByActivity[activityId]?.filter(s => s.time.startsWith(hourStr)) || [];
                
                if (slots.length === 0) {
                  return <div key={`${activityId}-${hour}`} className="h-10 bg-muted/30 rounded" />;
                }
                
                const slot = slots[0];
                const occupancy = slot.totalSlots > 0 ? (slot.bookedSlots || 0) / slot.totalSlots * 100 : 0;
                
                return (
                  <Tooltip key={`${activityId}-${hour}`}>
                    <TooltipTrigger asChild>
                      <button 
                        className={`h-10 rounded flex items-center justify-center text-xs font-medium text-white ${getOccupancyColor(occupancy)} hover:opacity-80 transition-opacity`}
                        onClick={() => onCreateReservation(slot)}
                      >
                        {slot.bookedSlots}/{slot.totalSlots}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getActivityName(activityId)} - {slot.time}</p>
                      <p>Doluluk: %{Math.round(occupancy)}</p>
                      <p className="text-xs text-muted-foreground">Rezervasyon oluşturmak için tıklayın</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

function CapacityCardWithEdit({ slot, activityName, onQuickAdjust, onCreateReservation }: { 
  slot: CapacitySlot; 
  activityName: string;
  onQuickAdjust: (id: number, adjustment: number) => void;
  onCreateReservation: (slot: CapacitySlot) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newSlots, setNewSlots] = useState(String(slot.totalSlots));
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isVirtual = slot.isVirtual;
  
  const updateMutation = useMutation({
    mutationFn: async (totalSlots: number) => {
      const res = await fetch(`/api/capacity/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSlots }),
      });
      if (!res.ok) throw new Error("Kapasite guncellenemedi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.capacity.list.path] });
      toast({ title: "Başarılı", description: "Kapasite güncellendi." });
      setEditOpen(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Kapasite güncellenemedi.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/capacity/${slot.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Kapasite silinemedi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.capacity.list.path] });
      toast({ title: "Başarılı", description: "Slot silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Slot silinemedi.", variant: "destructive" });
    },
  });

  const occupancy = slot.totalSlots > 0 ? (slot.bookedSlots || 0) / slot.totalSlots * 100 : 0;
  const available = slot.totalSlots - (slot.bookedSlots || 0);
  const isFull = occupancy >= 100;
  const isAlmostFull = occupancy >= 80 && occupancy < 100;
  const slotId = isVirtual ? `v-${slot.activityId}-${slot.time.replace(':', '')}` : String(slot.id);

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${isVirtual ? 'border-dashed border-2 border-primary/30 bg-primary/5' : ''} ${!isVirtual && isFull ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : !isVirtual && isAlmostFull ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`} data-testid={`card-capacity-${slotId}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold truncate" data-testid={`text-activity-name-${slotId}`}>{activityName}</h4>
                {isVirtual && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    Varsayılan
                  </Badge>
                )}
                {isFull && !isVirtual && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Dolu
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isFull ? "destructive" : isAlmostFull ? "secondary" : "outline"} className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {slot.time}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!isVirtual && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onQuickAdjust(slot.id, -1)}
                        disabled={slot.totalSlots <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Kapasite azalt</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onQuickAdjust(slot.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Kapasite artır</TooltipContent>
                  </Tooltip>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)} data-testid={`button-edit-capacity-${slotId}`}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteOpen(true)} data-testid={`button-delete-capacity-${slotId}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Doluluk</span>
              <span className={`font-medium ${getOccupancyTextColor(occupancy)}`}>
                {slot.bookedSlots || 0} / {slot.totalSlots}
              </span>
            </div>
            <Progress 
              value={occupancy} 
              className={`h-2 ${isFull ? '[&>div]:bg-red-500' : isAlmostFull ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{available} kişi boş</span>
              <span>%{Math.round(occupancy)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => onCreateReservation(slot)}
              disabled={isFull}
            >
              <Plus className="w-3 h-3 mr-1" />
              Rezervasyon
            </Button>
            {available > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Share2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>WhatsApp ile paylaş</TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kapasiteyi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Aktivite</Label>
              <Input value={activityName} disabled />
            </div>
            <div className="space-y-2">
              <Label>Saat</Label>
              <Input value={slot.time} disabled />
            </div>
            <div className="space-y-2">
              <Label>Toplam Kapasite</Label>
              <Input
                type="number"
                min="1"
                value={newSlots}
                onChange={(e) => setNewSlots(e.target.value)}
                data-testid="input-edit-total-slots"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Şu anda {slot.bookedSlots || 0} kişi rezerve etmiş.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>İptal</Button>
            <Button
              onClick={() => updateMutation.mutate(Number(newSlots))}
              disabled={updateMutation.isPending}
              data-testid="button-save-capacity"
            >
              {updateMutation.isPending ? "Güncelleniyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slotu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {activityName} - {slot.time} slotunu silmek istediğinizden emin misiniz?
              {(slot.bookedSlots || 0) > 0 && (
                <span className="block mt-2 font-medium text-red-600">
                  Dikkat: Bu slotta {slot.bookedSlots} rezervasyon bulunuyor!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BulkCapacityDialog({ activities }: { activities: any[] }) {
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [time, setTime] = useState("");
  const [totalSlots, setTotalSlots] = useState("10");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const activity = activities?.find(a => a.id === Number(selectedActivity));
  const defaultCapacity = activity ? (activity as any).defaultCapacity || 10 : 10;
  
  const getTimeOptions = () => {
    if (activity && (activity as any).defaultTimes) {
      try {
        const times = JSON.parse((activity as any).defaultTimes);
        return Array.isArray(times) && times.length > 0 ? times : generateAllTimeOptions();
      } catch {
        return generateAllTimeOptions();
      }
    }
    return generateAllTimeOptions();
  };

  const generateAllTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        times.push(`${h}:${m}`);
      }
    }
    return times;
  };

  const timeOptions = getTimeOptions();
  
  const bulkMutation = useMutation({
    mutationFn: async (data: { activityId: number; dates: string[]; time: string; totalSlots: number }) => {
      const res = await fetch('/api/capacity/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Toplu kapasite oluşturulamadı');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.capacity.list.path] });
      toast({ title: "Başarılı", description: `${data.created} slot oluşturuldu.` });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Toplu kapasite oluşturulamadı.", variant: "destructive" });
    },
  });
  
  const handleSubmit = () => {
    if (!selectedActivity || !time) return;
    
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (selectedDays.includes(dayOfWeek)) {
        dates.push(format(d, 'yyyy-MM-dd'));
      }
    }
    
    bulkMutation.mutate({
      activityId: Number(selectedActivity),
      dates,
      time,
      totalSlots: Number(totalSlots) || defaultCapacity,
    });
  };
  
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-bulk-capacity">
          <CalendarDays className="w-4 h-4 mr-2" />
          Toplu Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Toplu Kapasite Ekle</DialogTitle>
          <DialogDescription>Birden fazla güne aynı anda kapasite ekleyin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Aktivite</Label>
            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger data-testid="select-bulk-activity">
                <SelectValue placeholder="Aktivite seçin" />
              </SelectTrigger>
              <SelectContent>
                {activities?.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Başlangıç</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                data-testid="input-bulk-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Bitiş</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                data-testid="input-bulk-end-date"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Günler</Label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((name, index) => (
                <label key={index} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={selectedDays.includes(index)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDays([...selectedDays, index]);
                      } else {
                        setSelectedDays(selectedDays.filter(d => d !== index));
                      }
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Saat</Label>
            <Select value={time} onValueChange={setTime} disabled={!selectedActivity}>
              <SelectTrigger data-testid="select-bulk-time">
                <SelectValue placeholder={selectedActivity ? "Saat seçin" : "Önce aktivite seçin"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeOptions.map((t: string) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Kapasite</Label>
            <Input 
              type="number" 
              value={totalSlots} 
              onChange={e => setTotalSlots(e.target.value)}
              placeholder={`Varsayılan: ${defaultCapacity}`}
              data-testid="input-bulk-capacity"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedActivity || !time || bulkMutation.isPending}
            data-testid="button-submit-bulk"
          >
            {bulkMutation.isPending ? "Ekleniyor..." : "Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCapacityDialog() {
  const [open, setOpen] = useState(false);
  const { data: activities } = useActivities();
  const createMutation = useCreateCapacity();
  const { toast } = useToast();
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  const selectedActivity = activities?.find(a => a.id === selectedActivityId);
  const defaultCapacity = selectedActivity ? (selectedActivity as any).defaultCapacity || 10 : 10;

  const getTimeOptions = () => {
    if (selectedActivity && (selectedActivity as any).defaultTimes) {
      try {
        const times = JSON.parse((selectedActivity as any).defaultTimes);
        return Array.isArray(times) && times.length > 0 ? times : generateAllTimeOptions();
      } catch {
        return generateAllTimeOptions();
      }
    }
    return generateAllTimeOptions();
  };

  const generateAllTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        times.push(`${h}:${m}`);
      }
    }
    return times;
  };

  const timeOptions = getTimeOptions();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createMutation.mutateAsync({
        activityId: Number(formData.get("activityId")),
        date: formData.get("date") as string,
        time: formData.get("time") as string,
        totalSlots: Number(formData.get("totalSlots")) || defaultCapacity,
      });
      toast({ title: "Başarılı", description: "Slot başarıyla eklendi." });
      setOpen(false);
      setSelectedActivityId(null);
    } catch (err) {
      toast({ title: "Hata", description: "Slot eklenirken hata oluştu.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-capacity">
          <Plus className="w-4 h-4 mr-2" /> Slot Ekle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kapasite Planla</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Aktivite</Label>
            <Select 
              name="activityId" 
              required
              onValueChange={(val) => setSelectedActivityId(Number(val))}
            >
              <SelectTrigger data-testid="select-activity">
                <SelectValue placeholder="Aktivite seçin" />
              </SelectTrigger>
              <SelectContent>
                {activities?.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Tarih</Label>
            <Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} data-testid="input-date" />
          </div>

          <div className="space-y-2">
            <Label>Saat</Label>
            <Select name="time" required disabled={!selectedActivityId}>
              <SelectTrigger data-testid="select-time">
                <SelectValue placeholder={selectedActivityId ? "Saat seçin" : "Önce aktivite seçin"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeOptions.map((t: string) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Toplam Kapasite (Kişi)</Label>
            <Input 
              name="totalSlots" 
              type="number" 
              placeholder={`Varsayılan: ${defaultCapacity}`}
              defaultValue={defaultCapacity}
              data-testid="input-total-slots"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-capacity">
              {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoricalComparisonCard({ month, year }: { month: number; year: number }) {
  const { data: comparison, isLoading } = useQuery<{
    current: { totalReservations: number; totalGuests: number; totalRevenueTl: number; totalRevenueUsd: number };
    lastYear: { totalReservations: number; totalGuests: number; totalRevenueTl: number; totalRevenueUsd: number };
    growth: { reservations: number; guests: number; revenueTl: number };
  }>({
    queryKey: ['/api/capacity/compare', month, year],
    queryFn: async () => {
      const res = await fetch(`/api/capacity/compare?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Karşılaştırma alınamadı');
      return res.json();
    },
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!comparison) return null;
  
  const chartData = [
    { name: 'Geçen Yıl', reservations: comparison.lastYear.totalReservations, guests: comparison.lastYear.totalGuests },
    { name: 'Bu Yıl', reservations: comparison.current.totalReservations, guests: comparison.current.totalGuests },
  ];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Geçen Yıl Karşılaştırması
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Rezervasyon</p>
            <p className="text-lg font-bold">{comparison.current.totalReservations}</p>
            <p className={`text-xs ${comparison.growth.reservations >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {comparison.growth.reservations >= 0 ? '+' : ''}{comparison.growth.reservations}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Misafir</p>
            <p className="text-lg font-bold">{comparison.current.totalGuests}</p>
            <p className={`text-xs ${comparison.growth.guests >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {comparison.growth.guests >= 0 ? '+' : ''}{comparison.growth.guests}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gelir</p>
            <p className="text-lg font-bold">{(comparison.current.totalRevenueTl / 1000).toFixed(0)}K</p>
            <p className={`text-xs ${comparison.growth.revenueTl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {comparison.growth.revenueTl >= 0 ? '+' : ''}{comparison.growth.revenueTl}%
            </p>
          </div>
        </div>
        
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Bar dataKey="reservations" fill="hsl(var(--primary))" name="Rezervasyon" />
              <Bar dataKey="guests" fill="hsl(var(--muted-foreground))" name="Misafir" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [createReservationSlot, setCreateReservationSlot] = useState<CapacitySlot | null>(null);
  const formattedDate = format(date, "yyyy-MM-dd");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: capacity, isLoading: capacityLoading } = useCapacity({ date: formattedDate });
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  
  const { data: monthlyData } = useQuery<{ dailyStats: Record<string, { totalSlots: number; bookedSlots: number; occupancy: number }> }>({
    queryKey: ['/api/capacity/monthly', date.getMonth(), date.getFullYear(), activityFilter],
    queryFn: async () => {
      const url = new URL(window.location.origin + '/api/capacity/monthly');
      url.searchParams.append('month', String(date.getMonth()));
      url.searchParams.append('year', String(date.getFullYear()));
      if (activityFilter !== 'all') url.searchParams.append('activityId', activityFilter);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Aylık kapasite alınamadı');
      return res.json();
    },
  });

  const getActivityName = (id: number) => activities?.find(a => a.id === id)?.name || "Bilinmeyen";

  const filteredCapacity = activityFilter === 'all' 
    ? capacity 
    : capacity?.filter(c => c.activityId === Number(activityFilter));

  const stats = {
    totalSlots: filteredCapacity?.reduce((sum, c) => sum + c.totalSlots, 0) || 0,
    bookedSlots: filteredCapacity?.reduce((sum, c) => sum + (c.bookedSlots || 0), 0) || 0,
    get availableSlots() { return this.totalSlots - this.bookedSlots; },
    get occupancyRate() { return this.totalSlots > 0 ? Math.round((this.bookedSlots / this.totalSlots) * 100) : 0; },
    slotCount: filteredCapacity?.length || 0
  };
  
  const alertSlots = useMemo(() => {
    return filteredCapacity?.filter(c => {
      const occ = c.totalSlots > 0 ? (c.bookedSlots || 0) / c.totalSlots * 100 : 0;
      return occ >= 80;
    }) || [];
  }, [filteredCapacity]);

  const adjustMutation = useMutation({
    mutationFn: async ({ id, adjustment }: { id: number; adjustment: number }) => {
      const res = await fetch(`/api/capacity/${id}/adjust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment }),
      });
      if (!res.ok) throw new Error('Kapasite ayarlanamadı');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.capacity.list.path] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kapasite ayarlanamadı.", variant: "destructive" });
    },
  });

  const handleQuickAdjust = (id: number, adjustment: number) => {
    adjustMutation.mutate({ id, adjustment });
  };

  const handleCreateReservation = (slot: CapacitySlot) => {
    setCreateReservationSlot(slot);
  };

  const isLoading = capacityLoading || activitiesLoading;

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kapasite Raporu - ${format(date, 'd MMMM yyyy', { locale: tr })}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .full { color: red; font-weight: bold; }
          .almost { color: orange; }
        </style>
      </head>
      <body>
        <h1>Kapasite Raporu - ${format(date, 'd MMMM yyyy, EEEE', { locale: tr })}</h1>
        <p>Toplam Kapasite: ${stats.totalSlots} | Dolu: ${stats.bookedSlots} | Boş: ${stats.availableSlots}</p>
        <table>
          <thead>
            <tr>
              <th>Aktivite</th>
              <th>Saat</th>
              <th>Kapasite</th>
              <th>Dolu</th>
              <th>Boş</th>
              <th>Doluluk</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCapacity?.map(slot => {
              const occ = slot.totalSlots > 0 ? Math.round((slot.bookedSlots || 0) / slot.totalSlots * 100) : 0;
              const className = occ >= 100 ? 'full' : occ >= 80 ? 'almost' : '';
              return `
                <tr>
                  <td>${getActivityName(slot.activityId)}</td>
                  <td>${slot.time}</td>
                  <td>${slot.totalSlots}</td>
                  <td>${slot.bookedSlots || 0}</td>
                  <td>${slot.totalSlots - (slot.bookedSlots || 0)}</td>
                  <td class="${className}">%${occ}</td>
                </tr>
              `;
            }).join('') || ''}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Takvim & Kapasite</h1>
            <p className="text-muted-foreground mt-1">Müsaitlik durumunu yönetin</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-activity-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Aktivite Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Aktiviteler</SelectItem>
                {activities?.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <BulkCapacityDialog activities={activities || []} />
            <AddCapacityDialog />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handlePrintReport}>
                  <FileText className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>PDF Raporu</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {alertSlots.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {alertSlots.length} slot %80+ dolulukta
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-300">
                    {alertSlots.map(s => `${getActivityName(s.activityId)} (${s.time})`).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Toplam Kapasite" 
            value={stats.totalSlots} 
            subtitle={`${stats.slotCount} slot`}
            icon={Users} 
          />
          <StatCard 
            title="Dolu" 
            value={stats.bookedSlots} 
            subtitle={`%${stats.occupancyRate} doluluk`}
            icon={TrendingUp}
            trend={stats.occupancyRate > 80 ? 'up' : 'neutral'}
          />
          <StatCard 
            title="Boş" 
            value={stats.availableSlots} 
            icon={Calendar}
            trend={stats.availableSlots > 0 ? 'neutral' : 'down'}
          />
          <StatCard 
            title="Seçili Tarih" 
            value={format(date, "d MMM", { locale: tr })} 
            subtitle={format(date, "EEEE", { locale: tr })}
            icon={CalendarDays}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Aylık Görünüm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyCalendarView 
                  date={date} 
                  onDateSelect={setDate}
                  monthlyData={monthlyData?.dailyStats}
                  onMonthChange={setDate}
                />
              </CardContent>
            </Card>

            <HistoricalComparisonCard month={date.getMonth()} year={date.getFullYear()} />

            <div className="pt-2">
              <Link href={`/reservations?date=${format(date, "yyyy-MM-dd")}`}>
                <Button variant="outline" className="w-full" data-testid="button-view-reservations">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Bu Günün Rezervasyonları
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                {format(date, "d MMMM yyyy, EEEE", { locale: tr })}
              </h3>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="day" data-testid="tab-day-view">
                    <LayoutGrid className="w-4 h-4 mr-1" />
                    Gün
                  </TabsTrigger>
                  <TabsTrigger value="week" data-testid="tab-week-view">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    Hafta
                  </TabsTrigger>
                  <TabsTrigger value="timeline" data-testid="tab-timeline-view">
                    <Clock className="w-4 h-4 mr-1" />
                    Zaman Çizelgesi
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {viewMode === 'week' && (
              <WeekView 
                selectedDate={date} 
                onDateSelect={setDate}
              />
            )}

            {viewMode === 'timeline' && filteredCapacity && (
              <Card>
                <CardContent className="p-4">
                  <TimelineView 
                    capacity={filteredCapacity} 
                    activities={activities || []}
                    onCreateReservation={handleCreateReservation}
                  />
                </CardContent>
              </Card>
            )}

            {(viewMode === 'day' || viewMode === 'week') && (
              isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-2 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredCapacity?.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Calendar className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">Slot Bulunamadı</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {format(date, "d MMMM yyyy", { locale: tr })} için planlanmış slot yok.
                    </p>
                    <AddCapacityDialog />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredCapacity?.map((slot) => (
                    <CapacityCardWithEdit 
                      key={slot.isVirtual ? `virtual-${slot.activityId}-${slot.time}` : slot.id} 
                      slot={slot} 
                      activityName={getActivityName(slot.activityId)}
                      onQuickAdjust={handleQuickAdjust}
                      onCreateReservation={handleCreateReservation}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      <Dialog open={!!createReservationSlot} onOpenChange={() => setCreateReservationSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hızlı Rezervasyon</DialogTitle>
            <DialogDescription>
              {createReservationSlot && `${getActivityName(createReservationSlot.activityId)} - ${createReservationSlot.time} için rezervasyon oluşturun.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground mb-4">Rezervasyon oluşturmak için rezervasyonlar sayfasına gidin.</p>
            <Link href={`/reservations?date=${formattedDate}&activity=${createReservationSlot?.activityId}&time=${createReservationSlot?.time}`}>
              <Button onClick={() => setCreateReservationSlot(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Rezervasyon Sayfasına Git
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
