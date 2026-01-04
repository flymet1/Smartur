import { Sidebar } from "@/components/layout/Sidebar";
import { useReservations, useCreateReservation } from "@/hooks/use-reservations";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Calendar, List, Download, FileSpreadsheet, FileText, Package, X, MessageSquare, Bus, ChevronLeft, ChevronRight, Users, ChevronDown, CalendarDays, Info, Filter, MoreVertical, Link as LinkIcon, Copy, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useActivities } from "@/hooks/use-activities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { PackageTour, Activity, Reservation } from "@shared/schema";
import { useSearch, useLocation } from "wouter";
import { format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, isToday, eachDayOfInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CalendarView = "day" | "week" | "month";

export default function Reservations() {
  const { data: reservations, isLoading } = useReservations();
  const { data: activities } = useActivities();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const urlDate = new URLSearchParams(searchParams).get("date");
  
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>(urlDate || "");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name">("date-desc");
  const [selectedDateForNew, setSelectedDateForNew] = useState<string>("");
  const [newReservationOpen, setNewReservationOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (urlDate) {
      setDateFilter(urlDate);
      setCurrentDate(new Date(urlDate));
    }
  }, [urlDate]);

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

  const clearDateFilter = () => {
    setDateFilter("");
    setLocation("/reservations");
  };

  const filteredReservations = (reservations || [])
    .filter(r => {
      const matchesSearch = 
        r.customerName.toLowerCase().includes(search.toLowerCase()) || 
        r.customerPhone.includes(search) ||
        (r.orderNumber && r.orderNumber.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesActivity = activityFilter === "all" || String(r.activityId) === activityFilter;
      const matchesDate = !dateFilter || r.date === dateFilter;
      return matchesSearch && matchesStatus && matchesActivity && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "name") return a.customerName.localeCompare(b.customerName, 'tr');
      return 0;
    });

  const handleAddReservationForDate = (dateStr: string) => {
    setSelectedDateForNew(dateStr);
    setNewReservationOpen(true);
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    if (calendarView === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-4 max-w-full">
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
            <NewReservationDialog 
              open={newReservationOpen} 
              onOpenChange={setNewReservationOpen}
              defaultDate={selectedDateForNew}
            />
            <ReservationDetailDialog
              reservation={selectedReservation}
              activities={activities || []}
              onClose={() => setSelectedReservation(null)}
            />
          </div>
        </div>

        {dateFilter && (
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {(() => {
                    try {
                      const parsedDate = parse(dateFilter, "yyyy-MM-dd", new Date());
                      return format(parsedDate, "d MMMM yyyy, EEEE", { locale: tr });
                    } catch {
                      return dateFilter;
                    }
                  })()}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {filteredReservations.length} rezervasyon
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearDateFilter}
                data-testid="button-clear-date-filter"
              >
                <X className="h-4 w-4 mr-1" />
                Filtreyi Kaldır
              </Button>
            </div>
          </Card>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="p-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Ara..." 
                  className="pl-9" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="confirmed">Onaylı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className="rounded-r-none"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-[600px] bg-muted rounded animate-pulse" />
          </div>
        ) : viewMode === "list" ? (
          <ReservationTable reservations={filteredReservations} />
        ) : (
          <>
            <BigCalendar 
              reservations={reservations || []}
              activities={activities || []}
              view={calendarView}
              currentDate={currentDate}
              onViewChange={setCalendarView}
              onNavigate={navigateCalendar}
              onGoToToday={goToToday}
              onDateClick={handleAddReservationForDate}
              onDateSelect={setCurrentDate}
              onReservationSelect={setSelectedReservation}
              statusFilter={statusFilter}
              activityFilter={activityFilter}
              onActivityFilterChange={setActivityFilter}
            />
            <RecentReservations 
              reservations={reservations || []} 
              activities={activities || []}
            />
          </>
        )}
      </main>
    </div>
  );
}

interface BigCalendarProps {
  reservations: Reservation[];
  activities: Activity[];
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  onDateClick: (dateStr: string) => void;
  onDateSelect: (date: Date) => void;
  onReservationSelect: (reservation: Reservation) => void;
  statusFilter: string;
  activityFilter: string;
  onActivityFilterChange: (value: string) => void;
}

function BigCalendar({ 
  reservations, 
  activities, 
  view, 
  currentDate, 
  onViewChange, 
  onNavigate, 
  onGoToToday,
  onDateClick,
  onDateSelect,
  onReservationSelect,
  statusFilter,
  activityFilter,
  onActivityFilterChange
}: BigCalendarProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
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

  const getActivityColor = (activityId: number | null) => {
    if (!activityId) return "bg-gray-100 text-gray-700";
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-pink-100 text-pink-700 border-pink-200",
      "bg-cyan-100 text-cyan-700 border-cyan-200",
    ];
    return colors[activityId % colors.length];
  };

  const filteredReservations = reservations.filter(r => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesActivity = activityFilter === "all" || String(r.activityId) === activityFilter;
    return matchesStatus && matchesActivity;
  });

  const getReservationsForDate = (dateStr: string) => {
    return filteredReservations.filter(r => r.date === dateStr);
  };

  const getOccupancyForDate = (dateStr: string) => {
    const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
    const totalPeople = dayReservations.reduce((sum, r) => sum + r.quantity, 0);
    
    const activityOccupancy: Record<number, { name: string; count: number; total: number }> = {};
    
    dayReservations.forEach(r => {
      if (r.activityId) {
        if (!activityOccupancy[r.activityId]) {
          const activity = activities.find(a => a.id === r.activityId);
          activityOccupancy[r.activityId] = {
            name: activity?.name || "Aktivite",
            count: 0,
            total: (activity as any)?.defaultCapacity || 10
          };
        }
        activityOccupancy[r.activityId].count += r.quantity;
      }
    });

    return { totalPeople, activityOccupancy };
  };

  const calendarDays = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      return [currentDate];
    }
  }, [currentDate, view]);

  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: tr });
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: tr })} - ${format(weekEnd, 'd MMM yyyy', { locale: tr })}`;
    } else {
      return format(currentDate, 'd MMMM yyyy, EEEE', { locale: tr });
    }
  }, [currentDate, view]);

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => onNavigate('prev')} data-testid="button-calendar-prev">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => onNavigate('next')} data-testid="button-calendar-next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onGoToToday} data-testid="button-today">
              Bugün
            </Button>
            
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-date-picker">
                  <CalendarDays className="h-4 w-4" />
                  <span className="capitalize font-semibold">{headerTitle}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => {
                    if (date) {
                      onDateSelect(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={activityFilter} onValueChange={onActivityFilterChange}>
              <SelectTrigger className="w-40" data-testid="select-calendar-activity">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Aktivite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Aktiviteler</SelectItem>
                {activities.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button
                variant={view === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("day")}
                className="rounded-r-none"
                data-testid="button-view-day"
              >
                Gün
              </Button>
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("week")}
                className="rounded-none border-x"
                data-testid="button-view-week"
              >
                Hafta
              </Button>
              <Button
                variant={view === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("month")}
                className="rounded-l-none"
                data-testid="button-view-month"
              >
                Ay
              </Button>
            </div>
          </div>
        </div>
      </div>

      {view === 'month' && (
        <div className="grid grid-cols-7 border-b">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground bg-muted/30">
              {day}
            </div>
          ))}
        </div>
      )}

      {view === 'month' && (
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayReservations = getReservationsForDate(dateStr);
            const { totalPeople, activityOccupancy } = getOccupancyForDate(dateStr);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <div 
                key={idx}
                className={`min-h-[120px] border-b border-r p-1 ${
                  !isCurrentMonth ? 'bg-muted/20' : ''
                } ${isDayToday ? 'bg-primary/5' : ''} hover:bg-muted/30 cursor-pointer transition-colors`}
                onClick={() => onDateClick(dateStr)}
                data-testid={`calendar-day-${dateStr}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    isDayToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
                  } ${!isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {totalPeople > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1">
                          <Users className="h-3 w-3 mr-0.5" />
                          {totalPeople}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px]">
                        <div className="text-xs space-y-2">
                          <div className="font-semibold border-b pb-1 mb-1 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Toplam {totalPeople} kişi rezervasyon
                          </div>
                          <div className="text-muted-foreground text-[10px] mb-1">
                            Aktivite bazlı doluluk oranları:
                          </div>
                          {Object.entries(activityOccupancy).map(([id, data]) => {
                            const percentage = Math.round((data.count / data.total) * 100);
                            return (
                              <div key={id} className="flex justify-between gap-3 items-center">
                                <span className="truncate flex-1">{data.name}:</span>
                                <span className={`font-medium ${percentage >= 80 ? 'text-red-600' : percentage >= 50 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {data.count}/{data.total} (%{percentage})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="space-y-0.5 overflow-hidden max-h-[80px]">
                  {dayReservations.slice(0, 3).map(res => (
                    <div 
                      key={res.id}
                      className={`text-[10px] px-1 py-0.5 rounded truncate border ${getActivityColor(res.activityId)} ${
                        res.status === 'cancelled' ? 'opacity-50 line-through' : ''
                      }`}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`reservation-${res.id}`}
                    >
                      {res.time} {res.customerName.split(' ')[0]}
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayReservations.length - 3} daha
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayReservations = getReservationsForDate(dateStr);
            const { totalPeople, activityOccupancy } = getOccupancyForDate(dateStr);
            const isDayToday = isToday(day);

            return (
              <div 
                key={idx}
                className={`min-h-[400px] border-r p-2 ${isDayToday ? 'bg-primary/5' : ''} hover:bg-muted/30 cursor-pointer`}
                onClick={() => onDateClick(dateStr)}
                data-testid={`calendar-week-day-${dateStr}`}
              >
                <div className="text-center pb-2 border-b mb-2">
                  <div className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: tr })}</div>
                  <div className={`text-lg font-semibold ${isDayToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  {totalPeople > 0 && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {totalPeople} kişi
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[350px]">
                  {dayReservations.map(res => (
                    <ReservationCard 
                      key={res.id} 
                      reservation={res} 
                      activityName={getActivityName(res.activityId)}
                      activityColor={getActivityColor(res.activityId)}
                      onStatusChange={(status) => statusMutation.mutate({ id: res.id, status })}
                      onSelect={onReservationSelect}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'day' && (
        <div className="p-4">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayReservations = getReservationsForDate(dateStr);
            const { totalPeople, activityOccupancy } = getOccupancyForDate(dateStr);

            const allDefaultTimes = new Set<string>();
            const filteredActivities = activityFilter === 'all' 
              ? activities 
              : activities.filter(a => a.id.toString() === activityFilter);
            
            filteredActivities.forEach(activity => {
              if (activity.defaultTimes) {
                try {
                  const times = typeof activity.defaultTimes === 'string' 
                    ? JSON.parse(activity.defaultTimes) 
                    : activity.defaultTimes;
                  if (Array.isArray(times)) {
                    times.forEach((time: string) => allDefaultTimes.add(time));
                  }
                } catch (e) {
                  console.error('Error parsing defaultTimes:', e);
                }
              }
            });
            
            const sortedTimes = Array.from(allDefaultTimes).sort((a, b) => {
              const [aH, aM] = a.split(':').map(Number);
              const [bH, bM] = b.split(':').map(Number);
              return aH * 60 + aM - (bH * 60 + bM);
            });

            return (
              <div key={idx}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-lg font-semibold">{format(day, 'd MMMM, EEEE', { locale: tr })}</div>
                  {totalPeople > 0 && (
                    <Badge variant="secondary">Toplam {totalPeople} kişi</Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onDateClick(dateStr)}
                    data-testid="button-add-reservation-day"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Yeni Rezervasyon
                  </Button>
                </div>

                {Object.entries(activityOccupancy).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(activityOccupancy).map(([id, data]) => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {data.name}: {data.count}/{data.total} ({Math.round((data.count / data.total) * 100)}%)
                      </Badge>
                    ))}
                  </div>
                )}

                {sortedTimes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Seçili aktiviteler için varsayılan saat tanımlanmamış
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sortedTimes.map(timeSlot => {
                      const slotReservations = dayReservations.filter(r => r.time === timeSlot);

                      return (
                        <div key={timeSlot} className="flex border-b">
                          <div className="w-16 py-3 text-sm text-muted-foreground flex-shrink-0">
                            {timeSlot}
                          </div>
                          <div className="flex-1 py-1 min-h-[50px] flex flex-wrap gap-2">
                            {slotReservations.map(res => (
                              <ReservationCard 
                                key={res.id} 
                                reservation={res} 
                                activityName={getActivityName(res.activityId)}
                                activityColor={getActivityColor(res.activityId)}
                                onStatusChange={(status) => statusMutation.mutate({ id: res.id, status })}
                                onSelect={onReservationSelect}
                                expanded
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

interface ReservationCardProps {
  reservation: Reservation;
  activityName: string;
  activityColor: string;
  onStatusChange: (status: string) => void;
  onSelect?: (reservation: Reservation) => void;
  expanded?: boolean;
}

function ReservationCard({ reservation, activityName, activityColor, onStatusChange, onSelect, expanded }: ReservationCardProps) {
  const statusConfig = {
    confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700 border-green-200" },
    pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    cancelled: { label: "İptal", className: "bg-red-100 text-red-700 border-red-200" },
  };
  const status = statusConfig[reservation.status as keyof typeof statusConfig] || { label: reservation.status, className: "" };

  if (expanded) {
    return (
      <Card 
        className={`p-3 border ${activityColor} ${reservation.status === 'cancelled' ? 'opacity-50' : ''} cursor-pointer hover-elevate`}
        onClick={() => onSelect?.(reservation)}
        data-testid={`card-reservation-${reservation.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{reservation.customerName}</div>
            <div className="text-xs text-muted-foreground">{activityName}</div>
            <div className="text-xs mt-1">
              {reservation.time} - {reservation.quantity} kişi
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className={`${status.className} text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1`}
                onClick={(e) => e.stopPropagation()}
              >
                {status.label}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange('pending')} className="text-yellow-700">
                Beklemede
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('confirmed')} className="text-green-700">
                Onaylı
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('cancelled')} className="text-red-700">
                İptal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`p-2 text-xs border ${activityColor} ${reservation.status === 'cancelled' ? 'opacity-50' : ''} cursor-pointer hover-elevate`}
      onClick={() => onSelect?.(reservation)}
      data-testid={`card-reservation-${reservation.id}`}
    >
      <div className="font-medium truncate">{reservation.customerName}</div>
      <div className="text-muted-foreground truncate">{activityName}</div>
      <div className="flex items-center justify-between mt-1">
        <span>{reservation.time} - {reservation.quantity}p</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className={`${status.className} text-[10px] px-1 py-0.5 rounded border`}
              onClick={(e) => e.stopPropagation()}
            >
              {status.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStatusChange('pending')}>Beklemede</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('confirmed')}>Onaylı</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('cancelled')}>İptal</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

interface ReservationDetailDialogProps {
  reservation: Reservation | null;
  activities: Activity[];
  onClose: () => void;
}

function ReservationDetailDialog({ reservation, activities, onClose }: ReservationDetailDialogProps) {
  const { toast } = useToast();
  
  if (!reservation) return null;
  
  const activity = activities.find(a => a.id === reservation.activityId);
  const statusConfig = {
    confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700" },
    pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700" },
    cancelled: { label: "İptal", className: "bg-red-100 text-red-700" },
  };
  const status = statusConfig[reservation.status as keyof typeof statusConfig] || { label: reservation.status, className: "" };

  const copyTrackingLink = () => {
    if (reservation.trackingToken) {
      const link = `${window.location.origin}/takip/${reservation.trackingToken}`;
      navigator.clipboard.writeText(link);
      toast({ title: "Kopyalandı", description: "Takip linki panoya kopyalandı." });
    }
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Rezervasyon Detayı
            <Badge className={status.className}>{status.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Müşteri</Label>
              <div className="font-medium" data-testid="text-customer-name">{reservation.customerName}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Telefon</Label>
              <div className="font-medium" data-testid="text-customer-phone">{reservation.customerPhone}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">E-posta</Label>
              <div className="font-medium" data-testid="text-customer-email">{reservation.customerEmail || "-"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Kişi Sayısı</Label>
              <div className="font-medium" data-testid="text-quantity">{reservation.quantity} kişi</div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Aktivite</Label>
                <div className="font-medium" data-testid="text-activity">{activity?.name || "Bilinmiyor"}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Kaynak</Label>
                <div className="font-medium">{reservation.source === 'manual' ? 'Manuel' : reservation.source === 'woocommerce' ? 'WooCommerce' : reservation.source}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Tarih</Label>
                <div className="font-medium" data-testid="text-date">{reservation.date}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Saat</Label>
                <div className="font-medium" data-testid="text-time">{reservation.time}</div>
              </div>
            </div>
          </div>

          {(reservation.priceTl > 0 || reservation.priceUsd > 0) && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                {reservation.priceTl > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Fiyat (TL)</Label>
                    <div className="font-medium">{reservation.priceTl.toLocaleString('tr-TR')} ₺</div>
                  </div>
                )}
                {reservation.priceUsd > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Fiyat (USD)</Label>
                    <div className="font-medium">${reservation.priceUsd}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {reservation.orderNumber && (
            <div className="border-t pt-4">
              <Label className="text-muted-foreground text-xs">Sipariş No</Label>
              <div className="font-medium">{reservation.orderNumber}</div>
            </div>
          )}

          {reservation.hotelName && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Otel</Label>
                  <div className="font-medium">{reservation.hotelName}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Transfer</Label>
                  <div className="font-medium">{reservation.hasTransfer ? "Var" : "Yok"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {reservation.trackingToken && (
            <Button variant="outline" size="sm" onClick={copyTrackingLink} data-testid="button-copy-tracking">
              <Copy className="h-4 w-4 mr-1" />
              Takip Linki
            </Button>
          )}
          <Button variant="outline" onClick={onClose} data-testid="button-close-detail">
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NewReservationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: string;
}

function NewReservationDialog({ open: controlledOpen, onOpenChange, defaultDate }: NewReservationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const [reservationType, setReservationType] = useState<"activity" | "package">("activity");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [activityTimes, setActivityTimes] = useState<Record<number, string>>({});
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hasTransfer, setHasTransfer] = useState(false);
  const { data: activities } = useActivities();
  const createMutation = useCreateReservation();
  const { toast } = useToast();

  const { data: packageTours = [] } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });

  const { data: packageActivities = [] } = useQuery<(Activity & { defaultTime?: string })[]>({
    queryKey: ['/api/package-tours', selectedPackageId, 'activities'],
    enabled: !!selectedPackageId,
  });

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

  const getActivityTimes = (activity: Activity) => {
    try {
      return JSON.parse((activity as any).defaultTimes || "[]");
    } catch {
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerName = formData.get("customerName") as string;
    const customerPhone = formData.get("customerPhone") as string;
    const customerEmail = formData.get("customerEmail") as string;
    const orderNumber = formData.get("orderNumber") as string || undefined;
    const date = formData.get("date") as string;
    const quantity = Number(formData.get("quantity"));
    
    try {
      let createdActivityId: number | null = null;
      let createdTime: string = "";
      
      if (reservationType === "package" && selectedPackageId && packageActivities.length > 0) {
        for (const activity of packageActivities) {
          const time = activityTimes[activity.id] || (activity as any).defaultTime || "10:00";
          await createMutation.mutateAsync({
            activityId: activity.id,
            packageTourId: Number(selectedPackageId),
            orderNumber,
            customerName,
            customerPhone,
            customerEmail,
            date,
            time,
            quantity,
            status: "pending",
            source: "manual",
            hotelName: hotelName || undefined,
            hasTransfer,
          });
          if (!createdActivityId) {
            createdActivityId = activity.id;
            createdTime = time;
          }
        }
        
        if (notifyCustomer && customerPhone) {
          setIsSendingNotification(true);
          try {
            const selectedPackage = packageTours.find(p => String(p.id) === selectedPackageId);
            const response = await fetch('/api/send-whatsapp-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: customerPhone,
                customerName,
                activityName: selectedPackage?.name || 'Paket Tur',
                date,
                time: createdTime,
                packageTourId: Number(selectedPackageId)
              })
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'WhatsApp mesajı gönderilemedi');
            }
            toast({ title: "Başarılı", description: `Paket tur için ${packageActivities.length} rezervasyon oluşturuldu ve müşteri bilgilendirildi.` });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'WhatsApp mesajı gönderilemedi';
            toast({ title: "Uyarı", description: `Rezervasyon oluşturuldu ancak ${errorMsg}`, variant: "destructive" });
          } finally {
            setIsSendingNotification(false);
          }
        } else {
          toast({ title: "Başarılı", description: `Paket tur için ${packageActivities.length} rezervasyon oluşturuldu.` });
        }
      } else {
        const activityId = Number(formData.get("activityId"));
        const time = formData.get("time") as string;
        const createdReservation = await createMutation.mutateAsync({
          activityId,
          orderNumber,
          customerName,
          customerPhone,
          customerEmail,
          date,
          time,
          quantity,
          status: "pending",
          source: "manual",
          hotelName: hotelName || undefined,
          hasTransfer,
        });
        
        if (notifyCustomer && customerPhone) {
          setIsSendingNotification(true);
          try {
            let trackingToken: string | undefined;
            if (createdReservation?.id) {
              const tokenResponse = await fetch(`/api/reservations/${createdReservation.id}/generate-tracking`, {
                method: 'POST'
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                trackingToken = tokenData.token;
              }
            }
            
            const selectedAct = activities?.find(a => a.id === activityId);
            const response = await fetch('/api/send-whatsapp-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: customerPhone,
                customerName,
                activityName: selectedAct?.name || 'Aktivite',
                date,
                time,
                activityId,
                trackingToken
              })
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'WhatsApp mesajı gönderilemedi');
            }
            toast({ title: "Başarılı", description: "Rezervasyon oluşturuldu ve müşteri bilgilendirildi." });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'WhatsApp mesajı gönderilemedi';
            toast({ title: "Uyarı", description: `Rezervasyon oluşturuldu ancak ${errorMsg}`, variant: "destructive" });
          } finally {
            setIsSendingNotification(false);
          }
        } else {
          toast({ title: "Başarılı", description: "Rezervasyon oluşturuldu." });
        }
      }
      setOpen(false);
      setSelectedActivityId("");
      setSelectedPackageId("");
      setActivityTimes({});
      setReservationType("activity");
      setNotifyCustomer(false);
      setHotelName("");
      setHasTransfer(false);
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
      {!controlledOpen && (
        <DialogTrigger asChild>
          <Button className="w-full md:w-auto shadow-lg shadow-primary/20" data-testid="button-new-reservation">
            <Plus className="h-4 w-4 mr-2" /> Yeni Rezervasyon
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Rezervasyon Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={reservationType === "activity" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => {
                setReservationType("activity");
                setSelectedPackageId("");
                setActivityTimes({});
              }}
              data-testid="button-type-activity"
            >
              Tekli Aktivite
            </Button>
            <Button
              type="button"
              variant={reservationType === "package" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => {
                setReservationType("package");
                setSelectedActivityId("");
              }}
              data-testid="button-type-package"
            >
              <Package className="h-4 w-4 mr-2" />
              Paket Tur
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Müşteri Adı</Label>
              <Input name="customerName" required placeholder="Ad Soyad" data-testid="input-customer-name" />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input name="customerPhone" required placeholder="5XX..." data-testid="input-customer-phone" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-posta (İsteğe bağlı)</Label>
              <Input name="customerEmail" type="email" placeholder="ornek@email.com" data-testid="input-customer-email" />
            </div>
            <div className="space-y-2">
              <Label>Sipariş No (İsteğe bağlı)</Label>
              <Input name="orderNumber" placeholder="örn: 1234" data-testid="input-order-number" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Otel Adı (İsteğe bağlı)</Label>
              <Input 
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="örn: Liberty Hotels Lykia" 
                data-testid="input-hotel-name" 
              />
            </div>
            <div className="flex items-center space-x-3 mt-7">
              <Checkbox
                id="hasTransfer"
                checked={hasTransfer}
                onCheckedChange={(checked) => setHasTransfer(checked === true)}
                data-testid="checkbox-has-transfer"
              />
              <Label htmlFor="hasTransfer" className="text-sm cursor-pointer flex items-center gap-2">
                <Bus className="h-4 w-4 text-blue-600" />
                Otel Transferi İstedi
              </Label>
            </div>
          </div>

          {reservationType === "activity" ? (
            <div className="space-y-2">
              <Label>Aktivite</Label>
              <Select 
                name="activityId" 
                required 
                value={selectedActivityId}
                onValueChange={setSelectedActivityId}
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
          ) : (
            <div className="space-y-2">
              <Label>Paket Tur</Label>
              <Select 
                value={selectedPackageId}
                onValueChange={(val) => {
                  setSelectedPackageId(val);
                  setActivityTimes({});
                }}
              >
                <SelectTrigger data-testid="select-package">
                  <SelectValue placeholder="Paket tur seçin" />
                </SelectTrigger>
                <SelectContent>
                  {packageTours.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {reservationType === "package" && selectedPackageId && packageActivities.length > 0 && (
            <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                <Package className="h-4 w-4" />
                Paket İçeriği - Her aktivite için saat seçin
              </div>
              {packageActivities.map((activity) => {
                const times = getActivityTimes(activity);
                return (
                  <div key={activity.id} className="flex items-center gap-3 bg-background p-2 rounded-md">
                    <span className="flex-1 text-sm font-medium">{activity.name}</span>
                    {times.length > 0 ? (
                      <Select 
                        value={activityTimes[activity.id] || ""} 
                        onValueChange={(val) => setActivityTimes(prev => ({ ...prev, [activity.id]: val }))}
                      >
                        <SelectTrigger className="w-28" data-testid={`select-time-${activity.id}`}>
                          <SelectValue placeholder="Saat" />
                        </SelectTrigger>
                        <SelectContent>
                          {times.map((time: string) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="time"
                        className="w-28"
                        value={activityTimes[activity.id] || ""}
                        onChange={(e) => setActivityTimes(prev => ({ ...prev, [activity.id]: e.target.value }))}
                        data-testid={`input-time-${activity.id}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input 
                name="date" 
                type="date" 
                required 
                defaultValue={defaultDate || ""} 
                data-testid="input-date" 
              />
            </div>
            {reservationType === "activity" && (
              <div className="space-y-2">
                <Label>Saat</Label>
                {availableTimes.length > 0 ? (
                  <Select name="time" required>
                    <SelectTrigger data-testid="select-time">
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
                    data-testid="input-time"
                  />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Kişi Sayısı</Label>
              <Input name="quantity" type="number" min="1" defaultValue="1" required data-testid="input-quantity" />
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <Checkbox
              id="notifyCustomer"
              checked={notifyCustomer}
              onCheckedChange={(checked) => setNotifyCustomer(checked === true)}
              data-testid="checkbox-notify-customer"
            />
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <Label htmlFor="notifyCustomer" className="text-sm cursor-pointer">
                Müşteriyi WhatsApp ile bilgilendir
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || isSendingNotification || (reservationType === "package" && !selectedPackageId)}
              data-testid="button-submit-reservation"
            >
              {createMutation.isPending ? "Oluşturuluyor..." : isSendingNotification ? "Bildirim gönderiliyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RecentReservationsProps {
  reservations: Reservation[];
  activities: Activity[];
}

function RecentReservations({ reservations, activities }: RecentReservationsProps) {
  const { toast } = useToast();
  
  const recentReservations = useMemo(() => {
    return [...reservations]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  }, [reservations]);

  const getActivityName = (activityId: number | null) => {
    if (!activityId) return "Bilinmiyor";
    const activity = activities.find(a => a.id === activityId);
    return activity?.name || "Bilinmiyor";
  };

  const statusConfig = {
    confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    cancelled: { label: "İptal", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  const copyTrackingLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/takip/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link kopyalandı",
      description: "Takip linki panoya kopyalandı.",
    });
  };

  const openTrackingLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/takip/${token}`;
    window.open(link, '_blank');
  };

  if (recentReservations.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Son Rezervasyonlar
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {recentReservations.map((reservation) => {
            const status = statusConfig[reservation.status as keyof typeof statusConfig] || { label: reservation.status, className: "" };
            
            return (
              <div 
                key={reservation.id} 
                className="flex items-center justify-between gap-4 px-4 py-3 hover-elevate"
                data-testid={`recent-reservation-${reservation.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{reservation.customerName}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {reservation.quantity} kişi
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{getActivityName(reservation.activityId)}</span>
                    <span>-</span>
                    <span>{format(new Date(reservation.date), 'd MMM', { locale: tr })}</span>
                    {reservation.time && <span>{reservation.time}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${status.className} text-[10px]`}>
                    {status.label}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-menu-${reservation.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {reservation.trackingToken && (
                        <>
                          <DropdownMenuItem onClick={() => copyTrackingLink(reservation.trackingToken!)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Takip Linkini Kopyala
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openTrackingLink(reservation.trackingToken!)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Takip Sayfasını Aç
                          </DropdownMenuItem>
                        </>
                      )}
                      {!reservation.trackingToken && (
                        <DropdownMenuItem disabled>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Takip linki yok
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
