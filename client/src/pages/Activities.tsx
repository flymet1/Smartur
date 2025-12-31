import { Sidebar } from "@/components/layout/Sidebar";
import { useActivities, useCreateActivity, useDeleteActivity, useUpdateActivity } from "@/hooks/use-activities";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Clock, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Activity } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Activities() {
  const { data: activities, isLoading } = useActivities();
  const deleteMutation = useDeleteActivity();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (confirm("Bu aktiviteyi silmek istediğinize emin misiniz?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Başarılı", description: "Aktivite silindi." });
      } catch (error) {
        toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" });
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Aktiviteler</h1>
            <p className="text-muted-foreground mt-1">Turlarınızı ve hizmetlerinizi yönetin</p>
          </div>
          <ActivityDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities?.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onDelete={() => handleDelete(activity.id)} 
              />
            ))}
            {activities?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
                Henüz hiç aktivite eklenmemiş.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ActivityCard({ activity, onDelete }: { activity: Activity; onDelete: () => void }) {
  return (
    <div className="dashboard-card group relative overflow-hidden flex flex-col h-full">
      <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex items-center justify-center">
        <Tag className="w-16 h-16 text-primary/20 group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-xl">{activity.name}</h3>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
            {activity.active ? 'Aktif' : 'Pasif'}
          </span>
        </div>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
          {activity.description || "Açıklama yok"}
        </p>
        
        <div className="flex items-center gap-4 text-sm font-medium text-foreground/80 mb-6">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {activity.durationMinutes} dk
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">₺</span>
            {activity.price}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t mt-auto">
          <ActivityDialog activity={activity} trigger={
            <Button variant="outline" className="flex-1">
              <Edit className="w-4 h-4 mr-2" /> Düzenle
            </Button>
          } />
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityDialog({ activity, trigger }: { activity?: Activity; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<"1" | "3" | "5">(
    activity ? String((activity as any).dailyFrequency || 1) as "1" | "3" | "5" : "1"
  );
  const [times, setTimes] = useState<string[]>(() => {
    if (activity && (activity as any).defaultTimes) {
      try {
        return JSON.parse((activity as any).defaultTimes);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const { toast } = useToast();

  const isEditing = !!activity;

  const getDefaultTimes = (freq: "1" | "3" | "5") => {
    const freqNum = Number(freq);
    if (freqNum === 1) return ["09:00"];
    if (freqNum === 3) return ["09:00", "13:00", "17:00"];
    if (freqNum === 5) return ["08:00", "10:00", "13:00", "16:00", "18:00"];
    return [];
  };

  const handleFrequencyChange = (newFreq: "1" | "3" | "5") => {
    setFrequency(newFreq);
    setTimes(getDefaultTimes(newFreq));
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: Number(formData.get("price")),
      durationMinutes: Number(formData.get("durationMinutes")),
      dailyFrequency: Number(frequency),
      defaultTimes: JSON.stringify(times),
      active: true,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: activity.id, ...data });
        toast({ title: "Güncellendi", description: "Aktivite başarıyla güncellendi." });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: "Oluşturuldu", description: "Yeni aktivite başarıyla eklendi." });
      }
      setOpen(false);
    } catch (err) {
      toast({ 
        title: "Hata", 
        description: "İşlem sırasında bir hata oluştu.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
            <Plus className="w-4 h-4 mr-2" /> Yeni Aktivite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Aktiviteyi Düzenle' : 'Yeni Aktivite Ekle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Aktivite Adı</Label>
            <Input id="name" name="name" defaultValue={activity?.name} required placeholder="Örn: ATV Safari" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Fiyat (TL)</Label>
              <Input id="price" name="price" type="number" defaultValue={activity?.price} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Süre (Dakika)</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={activity?.durationMinutes} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Günde Kaç Defa?</Label>
            <div className="flex gap-2">
              {["1", "3", "5"].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => handleFrequencyChange(freq as "1" | "3" | "5")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                    frequency === freq
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:bg-muted/80"
                  }`}
                >
                  {freq}x
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Saatler</Label>
            <div className="space-y-2">
              {times.map((time, idx) => (
                <Input
                  key={idx}
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(idx, e.target.value)}
                  placeholder="HH:mm"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea 
              id="description" 
              name="description" 
              defaultValue={activity?.description || ""} 
              placeholder="Tur hakkında kısa bilgi..." 
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
