import { Sidebar } from "@/components/layout/Sidebar";
import { useReservations, useCreateReservation } from "@/hooks/use-reservations";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { ReservationCalendar } from "@/components/reservations/ReservationCalendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Calendar, List, Download, FileSpreadsheet, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Card } from "@/components/ui/card";

export default function Reservations() {
  const { data: reservations, isLoading } = useReservations();
  const { data: activities } = useActivities();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name">("date-desc");
  const { toast } = useToast();

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredReservations.length) {
      toast({ title: "Hata", description: "Dışa aktarılacak veri yok.", variant: "destructive" });
      return;
    }
    
    const headers = ["ID", "Müşteri", "Telefon", "E-posta", "Aktivite", "Tarih", "Saat", "Kişi", "TL", "USD", "Durum", "Kaynak"];
    const getActivityName = (activityId: number | null) => activities?.find(a => a.id === activityId)?.name || "Bilinmiyor";
    const getStatusText = (status: string | null) => {
      if (status === "confirmed") return "Onaylı";
      if (status === "pending") return "Beklemede";
      if (status === "cancelled") return "İptal";
      return status || "";
    };
    
    const rows = filteredReservations.map(r => [
      r.id,
      r.customerName,
      r.customerPhone,
      r.customerEmail || "",
      getActivityName(r.activityId),
      r.date,
      r.time,
      r.quantity,
      r.priceTl || 0,
      r.priceUsd || 0,
      getStatusText(r.status),
      r.source === "web" ? "Web" : r.source === "whatsapp" ? "WhatsApp" : "Manuel"
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rezervasyonlar_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Başarılı", description: "CSV dosyası indirildi." });
  };

  // Export to PDF (simple HTML-based)
  const exportToPDF = () => {
    if (!filteredReservations.length) {
      toast({ title: "Hata", description: "Dışa aktarılacak veri yok.", variant: "destructive" });
      return;
    }
    
    const getActivityName = (activityId: number | null) => activities?.find(a => a.id === activityId)?.name || "Bilinmiyor";
    const getStatusText = (status: string | null) => {
      if (status === "confirmed") return "Onaylı";
      if (status === "pending") return "Beklemede";
      if (status === "cancelled") return "İptal";
      return status || "";
    };
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Hata", description: "Pop-up engelleyici aktif olabilir.", variant: "destructive" });
      return;
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rezervasyonlar - ${new Date().toLocaleDateString("tr-TR")}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
          .confirmed { color: green; }
          .pending { color: orange; }
          .cancelled { color: red; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Rezervasyon Listesi</h1>
        <p>Tarih: ${new Date().toLocaleDateString("tr-TR")} - Toplam: ${filteredReservations.length} rezervasyon</p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Müşteri</th>
              <th>Telefon</th>
              <th>Aktivite</th>
              <th>Tarih</th>
              <th>Saat</th>
              <th>Kişi</th>
              <th>Tutar</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReservations.map(r => `
              <tr>
                <td>${r.id}</td>
                <td>${r.customerName}</td>
                <td>${r.customerPhone}</td>
                <td>${getActivityName(r.activityId)}</td>
                <td>${r.date}</td>
                <td>${r.time}</td>
                <td>${r.quantity}</td>
                <td>${r.priceTl ? r.priceTl + " TL" : ""}${r.priceUsd ? " / $" + r.priceUsd : ""}</td>
                <td class="${r.status}">${getStatusText(r.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    toast({ title: "Başarılı", description: "PDF için yazdırma penceresi açıldı." });
  };

  // Filter ve sort
  const filteredReservations = (reservations || [])
    .filter(r => {
      const matchesSearch = 
        r.customerName.toLowerCase().includes(search.toLowerCase()) || 
        r.customerPhone.includes(search);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesActivity = activityFilter === "all" || String(r.activityId) === activityFilter;
      return matchesSearch && matchesStatus && matchesActivity;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "name") return a.customerName.localeCompare(b.customerName, 'tr');
      return 0;
    });

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Rezervasyonlar</h1>
            <p className="text-muted-foreground mt-1">Tüm rezervasyonları görüntüleyin ve yönetin</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-export">
                  <Download className="h-4 w-4 mr-2" />
                  Dışa Aktar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} data-testid="button-export-csv">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV / Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} data-testid="button-export-pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF / Yazdır
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NewReservationDialog />
          </div>
        </div>

        {/* Arama Barı */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Müşteri adı veya telefon ile ara..." 
              className="pl-9 w-full" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {/* Filtreler */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Durum</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="confirmed">Onaylı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Aktivite</Label>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {activities?.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Sıralama</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">En Yeni</SelectItem>
                  <SelectItem value="date-asc">En Eski</SelectItem>
                  <SelectItem value="name">Müşteri Adı (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Görünüm</Label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="flex-1 h-9"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className="flex-1 h-9"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* İçerik */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        ) : viewMode === "list" ? (
          <ReservationTable reservations={filteredReservations} />
        ) : (
          <ReservationCalendar reservations={filteredReservations} />
        )}
      </main>
    </div>
  );
}

function NewReservationDialog() {
  const [open, setOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const { data: activities } = useActivities();
  const createMutation = useCreateReservation();
  const { toast } = useToast();

  const selectedActivity = activities?.find(a => String(a.id) === selectedActivityId);
  const availableTimes = selectedActivity 
    ? (() => {
        try {
          return JSON.parse((selectedActivity as any).defaultTimes || "[]");
        } catch {
          return [];
        }
      })()
    : [];

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
      setSelectedActivityId("");
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
            <Select 
              name="activityId" 
              required 
              value={selectedActivityId}
              onValueChange={setSelectedActivityId}
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Saat</Label>
              {availableTimes.length > 0 ? (
                <Select name="time" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Saat seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((time: string) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  name="time" 
                  type="time" 
                  placeholder="Önce aktivite seçin" 
                  disabled={!selectedActivityId}
                  required 
                />
              )}
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
