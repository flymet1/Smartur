import { Sidebar } from "@/components/layout/Sidebar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useCapacity, useCreateCapacity } from "@/hooks/use-capacity";
import { useActivities } from "@/hooks/use-activities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Capacity } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

function CapacitySlot({ slot, activityName, occupancy, isFull }: { slot: Capacity; activityName: string; occupancy: number; isFull: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
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
      if (!res.ok) throw new Error("Kapasite güncellenemedi");
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

  return (
    <div className="bg-card p-4 rounded-xl border flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-lg">{activityName}</h4>
          <Badge variant={isFull ? "destructive" : "secondary"}>
            {slot.time}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {slot.bookedSlots} / {slot.totalSlots} Dolu
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-32">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-green-500'}`} 
              style={{ width: `${occupancy}%` }}
            />
          </div>
          <p className="text-xs text-right mt-1 font-medium text-muted-foreground">
            %{Math.round(occupancy)} Doluluk
          </p>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Edit2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kapasiteyi Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Toplam Slot</Label>
                <Input
                  type="number"
                  min="1"
                  value={newSlots}
                  onChange={(e) => setNewSlots(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Şu anda {slot.bookedSlots} kişi rezerve etmiş.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={() => updateMutation.mutate(Number(newSlots))}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const formattedDate = date ? format(date, "yyyy-MM-dd") : undefined;
  
  const { data: capacity } = useCapacity({ date: formattedDate });
  const { data: activities } = useActivities();

  const getActivityName = (id: number) => activities?.find(a => a.id === id)?.name || "Bilinmeyen Aktivite";

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Takvim & Kapasite</h1>
            <p className="text-muted-foreground mt-1">Müsaitlik durumunu yönetin</p>
          </div>
          <AddCapacityDialog />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Sidebar */}
          <div className="lg:col-span-4">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={tr}
                  className="rounded-md border mx-auto"
                />
              </CardContent>
            </Card>
            
            <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2">Bilgi</h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                Seçili tarihteki slotları yanda görebilirsiniz. Kapasite eklemek için sağ üstteki butonu kullanın.
                WhatsApp botu sadece burada tanımlı kapasitelere göre rezervasyon alır.
              </p>
            </div>
          </div>

          {/* Slots View */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
              {date ? format(date, "d MMMM yyyy", { locale: tr }) : "Tarih Seçiniz"} Kapasite Durumu
            </h3>

            {capacity?.length === 0 ? (
              <div className="bg-card p-12 rounded-xl border border-dashed text-center">
                <p className="text-muted-foreground">Bu tarih için planlanmış slot bulunmuyor.</p>
                <div className="mt-4">
                  <AddCapacityDialog />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {capacity?.map((slot) => {
                  const occupancy = (slot.bookedSlots || 0) / slot.totalSlots * 100;
                  const isFull = occupancy >= 100;
                  
                  return (
                    <CapacitySlot
                      key={slot.id}
                      slot={slot}
                      activityName={getActivityName(slot.activityId)}
                      occupancy={occupancy}
                      isFull={isFull}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
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

  // Get activity's default times or fallback to 30-minute intervals
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

  // Generate 30-minute intervals (00:00 to 23:30) - fallback
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
        <Button className="shadow-lg shadow-primary/20">
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
              <SelectTrigger>
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
            <Input name="date" type="date" required />
          </div>

          <div className="space-y-2">
            <Label>Saat</Label>
            <Select name="time" required disabled={!selectedActivityId}>
              <SelectTrigger>
                <SelectValue placeholder={selectedActivityId ? "Saat seçin" : "Önce aktivite seçin"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedActivityId 
                ? `Seçili aktivitenin saatleri: ${timeOptions.join(", ")}` 
                : "Saatler aktivite seçildiğinde görünecektir"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Toplam Kapasite (Kişi)</Label>
            <Input 
              name="totalSlots" 
              type="number" 
              placeholder={`Varsayılan: ${defaultCapacity}`}
              defaultValue={defaultCapacity}
            />
            <p className="text-xs text-muted-foreground">
              Boş bırakırsanız aktivitenin varsayılan müsaitliği ({defaultCapacity}) kullanılır
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
