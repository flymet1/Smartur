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
import { Plus } from "lucide-react";
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
                    <div key={slot.id} className="bg-card p-4 rounded-xl border flex items-center justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg">{getActivityName(slot.activityId)}</h4>
                          <Badge variant={isFull ? "destructive" : "secondary"}>
                            {slot.time}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {slot.bookedSlots} / {slot.totalSlots} Dolu
                        </div>
                      </div>
                      
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
                    </div>
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createMutation.mutateAsync({
        activityId: Number(formData.get("activityId")),
        date: formData.get("date") as string,
        time: formData.get("time") as string,
        totalSlots: Number(formData.get("totalSlots")),
      });
      toast({ title: "Başarılı", description: "Slot başarıyla eklendi." });
      setOpen(false);
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
            <Select name="activityId" required>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Saat</Label>
              <Input name="time" type="time" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Toplam Kapasite (Kişi)</Label>
            <Input name="totalSlots" type="number" required min="1" placeholder="Örn: 20" />
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
