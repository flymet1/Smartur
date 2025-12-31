import { Sidebar } from "@/components/layout/Sidebar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { useCapacity, useCreateCapacity } from "@/hooks/use-capacity";
import { useActivities } from "@/hooks/use-activities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Calendar, Users, Clock, TrendingUp, Filter, CalendarDays, LayoutGrid, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Capacity } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

function CapacityCard({ slot, activityName, onEdit }: { slot: Capacity; activityName: string; onEdit: () => void }) {
  const occupancy = slot.totalSlots > 0 ? (slot.bookedSlots || 0) / slot.totalSlots * 100 : 0;
  const available = slot.totalSlots - (slot.bookedSlots || 0);
  const isFull = occupancy >= 100;
  const isAlmostFull = occupancy >= 80 && occupancy < 100;
  
  return (
    <Card className={`transition-all hover:shadow-md ${isFull ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : isAlmostFull ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`} data-testid={`card-capacity-${slot.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate" data-testid={`text-activity-name-${slot.id}`}>{activityName}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isFull ? "destructive" : isAlmostFull ? "secondary" : "outline"} className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {slot.time}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-capacity-${slot.id}`}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Doluluk</span>
            <span className={`font-medium ${isFull ? 'text-red-600' : isAlmostFull ? 'text-yellow-600' : 'text-green-600'}`}>
              {slot.bookedSlots || 0} / {slot.totalSlots}
            </span>
          </div>
          <Progress 
            value={occupancy} 
            className={`h-2 ${isFull ? '[&>div]:bg-red-500' : isAlmostFull ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{available} kisi bos</span>
            <span>%{Math.round(occupancy)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, trend }: { title: string; value: string | number; subtitle?: string; icon: any; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-600' : trend === 'down' ? 'bg-red-100 text-red-600' : 'bg-muted'}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
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
        const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
        
        return (
          <button
            key={dateStr}
            onClick={() => onDateSelect(day)}
            className={`p-3 rounded-lg text-center transition-all ${
              isSelected 
                ? 'bg-primary text-primary-foreground' 
                : isToday 
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

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const formattedDate = format(date, "yyyy-MM-dd");
  
  const { data: capacity, isLoading: capacityLoading } = useCapacity({ date: formattedDate });
  const { data: activities, isLoading: activitiesLoading } = useActivities();

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

  const isLoading = capacityLoading || activitiesLoading;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Takvim & Kapasite</h1>
            <p className="text-muted-foreground mt-1">Musaitlik durumunu yonetin</p>
          </div>
          <AddCapacityDialog />
        </div>

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
            title="Bos" 
            value={stats.availableSlots} 
            icon={Calendar}
            trend={stats.availableSlots > 0 ? 'neutral' : 'down'}
          />
          <StatCard 
            title="Secili Tarih" 
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
                  Takvim
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={tr}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtreler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Aktivite</Label>
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger data-testid="select-activity-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Aktiviteler</SelectItem>
                      {activities?.map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                {format(date, "d MMMM yyyy, EEEE", { locale: tr })}
              </h3>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week')}>
                <TabsList>
                  <TabsTrigger value="day" data-testid="tab-day-view">
                    <LayoutGrid className="w-4 h-4 mr-1" />
                    Gun
                  </TabsTrigger>
                  <TabsTrigger value="week" data-testid="tab-week-view">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    Hafta
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

            {isLoading ? (
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
                  <h3 className="font-semibold mb-1">Slot Bulunamadi</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {format(date, "d MMMM yyyy", { locale: tr })} icin planlanmis slot yok.
                  </p>
                  <AddCapacityDialog />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredCapacity?.map((slot) => (
                  <CapacityCardWithEdit 
                    key={slot.id} 
                    slot={slot} 
                    activityName={getActivityName(slot.activityId)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CapacityCardWithEdit({ slot, activityName }: { slot: Capacity; activityName: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newSlots, setNewSlots] = useState(String(slot.totalSlots));
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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
      toast({ title: "Basarili", description: "Kapasite guncellendi." });
      setEditOpen(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Kapasite guncellenemedi.", variant: "destructive" });
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
      toast({ title: "Basarili", description: "Slot silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Slot silinemedi.", variant: "destructive" });
    },
  });

  const occupancy = slot.totalSlots > 0 ? (slot.bookedSlots || 0) / slot.totalSlots * 100 : 0;
  const available = slot.totalSlots - (slot.bookedSlots || 0);
  const isFull = occupancy >= 100;
  const isAlmostFull = occupancy >= 80 && occupancy < 100;

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${isFull ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : isAlmostFull ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`} data-testid={`card-capacity-${slot.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate" data-testid={`text-activity-name-${slot.id}`}>{activityName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isFull ? "destructive" : isAlmostFull ? "secondary" : "outline"} className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {slot.time}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} data-testid={`button-edit-capacity-${slot.id}`}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteOpen(true)} data-testid={`button-delete-capacity-${slot.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Doluluk</span>
              <span className={`font-medium ${isFull ? 'text-red-600' : isAlmostFull ? 'text-yellow-600' : 'text-green-600'}`}>
                {slot.bookedSlots || 0} / {slot.totalSlots}
              </span>
            </div>
            <Progress 
              value={occupancy} 
              className={`h-2 ${isFull ? '[&>div]:bg-red-500' : isAlmostFull ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{available} kisi bos</span>
              <span>%{Math.round(occupancy)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kapasiteyi Duzenle</DialogTitle>
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
              Su anda {slot.bookedSlots || 0} kisi rezerve etmis.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Iptal</Button>
            <Button
              onClick={() => updateMutation.mutate(Number(newSlots))}
              disabled={updateMutation.isPending}
              data-testid="button-save-capacity"
            >
              {updateMutation.isPending ? "Guncelleniyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slotu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {activityName} - {slot.time} slotunu silmek istediginizden emin misiniz?
              {(slot.bookedSlots || 0) > 0 && (
                <span className="block mt-2 font-medium text-red-600">
                  Dikkat: Bu slotta {slot.bookedSlots} rezervasyon bulunuyor!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
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
      toast({ title: "Basarili", description: "Slot basariyla eklendi." });
      setOpen(false);
      setSelectedActivityId(null);
    } catch (err) {
      toast({ title: "Hata", description: "Slot eklenirken hata olustu.", variant: "destructive" });
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
                <SelectValue placeholder="Aktivite secin" />
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
                <SelectValue placeholder={selectedActivityId ? "Saat secin" : "Once aktivite secin"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Toplam Kapasite (Kisi)</Label>
            <Input 
              name="totalSlots" 
              type="number" 
              placeholder={`Varsayilan: ${defaultCapacity}`}
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
