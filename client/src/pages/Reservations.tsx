import { Sidebar } from "@/components/layout/Sidebar";
import { useReservations, useCreateReservation } from "@/hooks/use-reservations";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useActivities } from "@/hooks/use-activities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Reservations() {
  const { data: reservations, isLoading } = useReservations();
  const [search, setSearch] = useState("");

  const filteredReservations = reservations?.filter(r => 
    r.customerName.toLowerCase().includes(search.toLowerCase()) || 
    r.customerPhone.includes(search)
  ) || [];

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Rezervasyonlar</h1>
            <p className="text-muted-foreground mt-1">Tüm rezervasyonları görüntüleyin ve yönetin</p>
          </div>
          <NewReservationDialog />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Müşteri adı veya telefon ile ara..." 
              className="pl-9 w-full" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" /> Filtrele
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : (
          <ReservationTable reservations={filteredReservations} />
        )}
      </main>
    </div>
  );
}

function NewReservationDialog() {
  const [open, setOpen] = useState(false);
  const { data: activities } = useActivities();
  const createMutation = useCreateReservation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createMutation.mutateAsync({
        activityId: Number(formData.get("activityId")),
        customerName: formData.get("customerName") as string,
        customerPhone: formData.get("customerPhone") as string,
        customerEmail: formData.get("customerEmail") as string,
        date: formData.get("date") as string,
        time: formData.get("time") as string,
        quantity: Number(formData.get("quantity")),
        status: "pending",
        source: "manual",
      });
      toast({ title: "Başarılı", description: "Rezervasyon oluşturuldu." });
      setOpen(false);
    } catch (err) {
      toast({ 
        title: "Hata", 
        description: "Rezervasyon oluşturulamadı. Kapasite dolu olabilir.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Yeni Rezervasyon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yeni Rezervasyon Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Müşteri Adı</Label>
              <Input name="customerName" required placeholder="Ad Soyad" />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input name="customerPhone" required placeholder="5XX..." />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>E-posta (İsteğe bağlı)</Label>
            <Input name="customerEmail" type="email" placeholder="ornek@email.com" />
          </div>

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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Saat</Label>
              <Input name="time" type="time" required />
            </div>
            <div className="space-y-2">
              <Label>Kişi Sayısı</Label>
              <Input name="quantity" type="number" min="1" defaultValue="1" required />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
