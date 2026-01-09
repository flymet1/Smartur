import { Sidebar } from "@/components/layout/Sidebar";
import { useReservations, useCreateReservation } from "@/hooks/use-reservations";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Calendar, List, Download, FileSpreadsheet, FileText, Package, X, MessageSquare, Bus, ChevronLeft, ChevronRight, Users, ChevronDown, CalendarDays, Info, Filter, MoreVertical, Link as LinkIcon, Copy, ExternalLink, Bell, Clock, Check, TrendingUp, TrendingDown, DollarSign, Banknote, CalendarCheck, UserCheck, XCircle, Trash2, Send, Star, StickyNote, History, Menu, Phone, Mail, CheckCircle, User, Building, MessageCircle, ArrowUpDown, Pencil, Save, Handshake } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useActivities } from "@/hooks/use-activities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { PackageTour, Activity, Reservation, Agency, Holiday } from "@shared/schema";
import { useSearch, useLocation } from "wouter";
import { format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, isToday, eachDayOfInterval, subDays, isWithinInterval, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getErrorToastMessage, isLicenseError } from "@/lib/error-utils";
import { LicenseLimitDialog, parseLicenseError } from "@/components/LicenseLimitDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type CalendarView = "day" | "week" | "month";

function getOccupancyColor(occupancy: number): string {
  if (occupancy >= 100) return 'bg-red-600 dark:bg-red-700';
  if (occupancy >= 80) return 'bg-orange-500 dark:bg-orange-600';
  if (occupancy >= 50) return 'bg-yellow-500 dark:bg-yellow-600';
  if (occupancy > 0) return 'bg-green-500 dark:bg-green-600';
  return 'bg-muted';
}

export default function Reservations() {
  const { data: reservations, isLoading } = useReservations();
  const { data: activities } = useActivities();
  const { data: packageTours = [] } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });
  const { data: agencies = [] } = useQuery<Agency[]>({
    queryKey: ['/api/finance/agencies']
  });
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays']
  });
  const { data: reservationRequests = [] } = useQuery<{ id: number; status: string | null }[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
  });
  const pendingRequestsCount = reservationRequests.filter(r => r.status === 'pending').length;
  const { data: bulkTemplatesSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'bulkMessageTemplates'],
    queryFn: async () => {
      const res = await fetch('/api/settings/bulkMessageTemplates');
      return res.json();
    },
  });
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(searchParams);
  const urlDate = urlParams.get("date");
  const urlView = urlParams.get("view");
  
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">(() => {
    if (urlView === "list" || urlView === "calendar") {
      return urlView;
    }
    return "calendar";
  });
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [packageTourFilter, setPackageTourFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>(urlDate || "");
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [sortBy, setSortBy] = useState<string>(() => {
    const saved = localStorage.getItem("reservationListSort");
    return saved || "date-desc";
  });
  const [selectedDateForNew, setSelectedDateForNew] = useState<string>("");
  const [newReservationOpen, setNewReservationOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showNewReservations, setShowNewReservations] = useState(false);
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false);
  const [bulkWhatsAppMessage, setBulkWhatsAppMessage] = useState("");
  const [bulkWhatsAppSending, setBulkWhatsAppSending] = useState(false);
  const [bulkTemplateType, setBulkTemplateType] = useState<"confirmed" | "pending" | "cancelled">("confirmed");
  const [moveNotification, setMoveNotification] = useState<{ reservation: Reservation; oldDate: string; newDate: string; oldTime?: string; newTime?: string } | null>(null);
  const [moveCustomerMsg, setMoveCustomerMsg] = useState("");
  const [moveAgencyMsg, setMoveAgencyMsg] = useState("");
  const [moveAgencyId, setMoveAgencyId] = useState("");
  const { toast } = useToast();

  const generateMoveCustomerMessage = (customerName: string, oldDate: string, newDate: string, oldTime?: string, newTime?: string) => {
    const oldDateFormatted = format(new Date(oldDate), "d MMMM yyyy", { locale: tr });
    const newDateFormatted = format(new Date(newDate), "d MMMM yyyy", { locale: tr });
    let message = `Merhaba ${customerName},\n\nRezervasyonunuz güncellenmistir.\n\n`;
    if (oldDate !== newDate) {
      message += `Eski tarih: ${oldDateFormatted}\nYeni tarih: ${newDateFormatted}\n`;
    }
    if (oldTime && newTime && oldTime !== newTime) {
      message += `Eski saat: ${oldTime}\nYeni saat: ${newTime}\n`;
    }
    message += "\nIyi gunler dileriz.";
    return message;
  };

  const generateMoveAgencyMessage = (customerName: string, oldDate: string, newDate: string, oldTime?: string, newTime?: string) => {
    const oldDateFormatted = format(new Date(oldDate), "d MMMM yyyy", { locale: tr });
    const newDateFormatted = format(new Date(newDate), "d MMMM yyyy", { locale: tr });
    let message = `Bilgilendirme: ${customerName} isimli müşterinin rezervasyonu güncellendi.\n\n`;
    if (oldDate !== newDate) {
      message += `Eski tarih: ${oldDateFormatted}\nYeni tarih: ${newDateFormatted}\n`;
    }
    if (oldTime && newTime && oldTime !== newTime) {
      message += `Eski saat: ${oldTime}\nYeni saat: ${newTime}\n`;
    }
    return message;
  };

  const openMoveNotification = (reservation: Reservation, oldDate: string, newDate: string, oldTime?: string, newTime?: string) => {
    setMoveCustomerMsg(generateMoveCustomerMessage(reservation.customerName, oldDate, newDate, oldTime, newTime));
    setMoveAgencyMsg(generateMoveAgencyMessage(reservation.customerName, oldDate, newDate, oldTime, newTime));
    setMoveAgencyId(reservation.agencyId ? String(reservation.agencyId) : "");
    setMoveNotification({ reservation, oldDate, newDate, oldTime, newTime });
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/reservations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
    },
  });

  const lastViewedKey = "lastViewedReservationsAt";
  const lastViewedAt = useMemo(() => {
    const stored = localStorage.getItem(lastViewedKey);
    return stored ? new Date(stored) : null;
  }, []);

  const unseenReservations = useMemo(() => {
    if (!reservations || !lastViewedAt) return reservations || [];
    return reservations.filter(r => {
      const createdAt = r.createdAt ? new Date(r.createdAt) : null;
      return createdAt && createdAt > lastViewedAt;
    });
  }, [reservations, lastViewedAt]);

  const markReservationsAsSeen = () => {
    localStorage.setItem(lastViewedKey, new Date().toISOString());
    setShowNewReservations(false);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    localStorage.setItem("reservationListSort", value);
  };

  useEffect(() => {
    if (urlDate) {
      setDateFilter(urlDate);
      setCurrentDate(new Date(urlDate));
    }
  }, [urlDate]);

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!reservations) return null;
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekEnd, 7);
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    const confirmedReservations = reservations.filter(r => r.status === 'confirmed' || r.status === 'pending');
    
    // Today's stats
    const todayReservations = confirmedReservations.filter(r => r.date === todayStr);
    const todayRevenueTl = todayReservations.reduce((sum, r) => sum + (r.priceTl || 0), 0);
    const todayRevenueUsd = todayReservations.reduce((sum, r) => sum + (r.priceUsd || 0), 0);
    const todayGuests = todayReservations.reduce((sum, r) => sum + r.quantity, 0);

    // This week's stats
    const thisWeekReservations = confirmedReservations.filter(r => {
      const date = new Date(r.date);
      return isWithinInterval(date, { start: thisWeekStart, end: thisWeekEnd });
    });
    const thisWeekRevenueTl = thisWeekReservations.reduce((sum, r) => sum + (r.priceTl || 0), 0);
    const thisWeekRevenueUsd = thisWeekReservations.reduce((sum, r) => sum + (r.priceUsd || 0), 0);
    const thisWeekGuests = thisWeekReservations.reduce((sum, r) => sum + r.quantity, 0);

    // Last week's stats (for comparison)
    const lastWeekReservations = confirmedReservations.filter(r => {
      const date = new Date(r.date);
      return isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd });
    });
    const lastWeekRevenueTl = lastWeekReservations.reduce((sum, r) => sum + (r.priceTl || 0), 0);
    const lastWeekGuests = lastWeekReservations.reduce((sum, r) => sum + r.quantity, 0);

    // This month's stats
    const thisMonthReservations = confirmedReservations.filter(r => {
      const date = new Date(r.date);
      return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
    });
    const thisMonthRevenueTl = thisMonthReservations.reduce((sum, r) => sum + (r.priceTl || 0), 0);
    const thisMonthRevenueUsd = thisMonthReservations.reduce((sum, r) => sum + (r.priceUsd || 0), 0);
    const thisMonthGuests = thisMonthReservations.reduce((sum, r) => sum + r.quantity, 0);

    // Last month (for comparison)
    const lastMonthReservations = confirmedReservations.filter(r => {
      const date = new Date(r.date);
      return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
    });
    const lastMonthRevenueTl = lastMonthReservations.reduce((sum, r) => sum + (r.priceTl || 0), 0);

    // Pending count (reservations + partner requests)
    const pendingReservationsCount = reservations.filter(r => r.status === 'pending').length;
    const pendingCount = pendingReservationsCount + pendingRequestsCount;

    // Week comparison percentage
    const weekGrowth = lastWeekRevenueTl > 0 
      ? ((thisWeekRevenueTl - lastWeekRevenueTl) / lastWeekRevenueTl * 100).toFixed(0)
      : thisWeekRevenueTl > 0 ? '100' : '0';

    const monthGrowth = lastMonthRevenueTl > 0
      ? ((thisMonthRevenueTl - lastMonthRevenueTl) / lastMonthRevenueTl * 100).toFixed(0)
      : thisMonthRevenueTl > 0 ? '100' : '0';

    return {
      today: { count: todayReservations.length, revenueTl: todayRevenueTl, revenueUsd: todayRevenueUsd, guests: todayGuests },
      thisWeek: { count: thisWeekReservations.length, revenueTl: thisWeekRevenueTl, revenueUsd: thisWeekRevenueUsd, guests: thisWeekGuests, growth: parseInt(weekGrowth) },
      thisMonth: { count: thisMonthReservations.length, revenueTl: thisMonthRevenueTl, revenueUsd: thisMonthRevenueUsd, guests: thisMonthGuests, growth: parseInt(monthGrowth) },
      pendingCount,
      pendingReservationsCount,
    };
  }, [reservations, pendingRequestsCount]);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredReservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReservations.map(r => r.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk actions mutations
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      await Promise.all(ids.map(id => apiRequest('PATCH', `/api/reservations/${id}/status`, { status })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      clearSelection();
      toast({ title: "Başarılı", description: "Seçili rezervasyonların durumu güncellendi." });
    },
    onError: (err) => {
      const { title, description } = getErrorToastMessage(err);
      toast({ title, description, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/reservations/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      clearSelection();
      toast({ title: "Başarılı", description: "Seçili rezervasyonlar silindi." });
    },
    onError: (err) => {
      const { title, description } = getErrorToastMessage(err);
      toast({ title, description, variant: "destructive" });
    },
  });

  // Advanced filters
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [priceMinFilter, setPriceMinFilter] = useState<string>("");
  const [priceMaxFilter, setPriceMaxFilter] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Saved filter profiles
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: any }>>(() => {
    const stored = localStorage.getItem("savedReservationFilters");
    return stored ? JSON.parse(stored) : [];
  });

  const saveCurrentFilter = (name: string) => {
    const newFilter = {
      name,
      filters: { statusFilter, activityFilter, sourceFilter, agencyFilter, priceMinFilter, priceMaxFilter, packageTourFilter }
    };
    const updated = [...savedFilters.filter(f => f.name !== name), newFilter];
    setSavedFilters(updated);
    localStorage.setItem("savedReservationFilters", JSON.stringify(updated));
    toast({ title: "Kaydedildi", description: `"${name}" filtresi kaydedildi.` });
  };

  const loadSavedFilter = (filter: any) => {
    setStatusFilter(filter.filters.statusFilter || "all");
    setActivityFilter(filter.filters.activityFilter || "all");
    setSourceFilter(filter.filters.sourceFilter || "all");
    setAgencyFilter(filter.filters.agencyFilter || "all");
    setPriceMinFilter(filter.filters.priceMinFilter || "");
    setPriceMaxFilter(filter.filters.priceMaxFilter || "");
    setPackageTourFilter(filter.filters.packageTourFilter || "all");
    toast({ title: "Yüklendi", description: `"${filter.name}" filtresi uygulandı.` });
  };

  const deleteSavedFilter = (name: string) => {
    const updated = savedFilters.filter(f => f.name !== name);
    setSavedFilters(updated);
    localStorage.setItem("savedReservationFilters", JSON.stringify(updated));
  };

  // Customer conflict detection
  const customerConflicts = useMemo(() => {
    if (!reservations) return [];
    const conflicts: Array<{ customer: string; reservations: Reservation[] }> = [];
    const customerMap = new Map<string, Reservation[]>();
    
    reservations.filter(r => r.status !== 'cancelled').forEach(r => {
      const key = r.customerPhone;
      if (!customerMap.has(key)) customerMap.set(key, []);
      customerMap.get(key)!.push(r);
    });

    customerMap.forEach((resos, customer) => {
      // Check for same-day different activities
      const dateGroups = new Map<string, Reservation[]>();
      resos.forEach(r => {
        if (!dateGroups.has(r.date)) dateGroups.set(r.date, []);
        dateGroups.get(r.date)!.push(r);
      });
      dateGroups.forEach((dayResos) => {
        if (dayResos.length > 1) {
          const uniqueActivities = new Set(dayResos.map(r => r.activityId));
          if (uniqueActivities.size > 1) {
            conflicts.push({ customer: dayResos[0].customerName, reservations: dayResos });
          }
        }
      });
    });
    return conflicts;
  }, [reservations]);

  // Customer history state
  const [customerHistoryPhone, setCustomerHistoryPhone] = useState<string | null>(null);
  const [customerHistoryName, setCustomerHistoryName] = useState<string>("");

  const customerHistory = useMemo(() => {
    if (!customerHistoryPhone || !reservations) return [];
    return reservations.filter(r => r.customerPhone === customerHistoryPhone).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [customerHistoryPhone, reservations]);

  // Right-click context reservation
  const [contextReservation, setContextReservation] = useState<Reservation | null>(null);

  // Copy reservation to new date
  const copyReservationMutation = useMutation({
    mutationFn: async ({ reservation, newDate }: { reservation: Reservation; newDate: string }) => {
      const newRes = {
        activityId: reservation.activityId,
        packageTourId: reservation.packageTourId,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail,
        date: newDate,
        time: reservation.time,
        quantity: reservation.quantity,
        priceTl: reservation.priceTl,
        priceUsd: reservation.priceUsd,
        currency: reservation.currency,
        status: 'pending',
        source: 'manual',
      };
      return apiRequest('POST', '/api/reservations', newRes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: "Başarılı", description: "Rezervasyon kopyalandı." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kopyalama başarısız.", variant: "destructive" });
    },
  });

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
      r.source === "web" ? "Web" : r.source === "whatsapp" ? "WhatsApp" : r.source === "partner" ? (() => {
        const partnerMatch = (r as any).notes?.match(/\[Partner:\s*([^\]]+)\]/);
        return partnerMatch ? `Partner: ${partnerMatch[1]}` : 'Partner Acenta';
      })() : "Manuel"
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
      toast({ title: "Hata", description: "Pop-up engelleyiçi aktif olabilir.", variant: "destructive" });
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
      // Turkish-aware lowercase conversion
      const turkishLower = (str: string) => str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .replace(/Ş/g, 'ş')
        .replace(/Ğ/g, 'ğ')
        .replace(/Ü/g, 'ü')
        .replace(/Ö/g, 'ö')
        .replace(/Ç/g, 'ç')
        .toLowerCase();
      
      const searchLower = turkishLower(search);
      const matchesSearch = 
        turkishLower(r.customerName).includes(searchLower) || 
        r.customerPhone.toLowerCase().includes(searchLower) ||
        (r.orderNumber && r.orderNumber.toLowerCase().includes(searchLower)) ||
        (r.hotelName && turkishLower(r.hotelName).includes(searchLower)) ||
        (r.customerEmail && r.customerEmail.toLowerCase().includes(searchLower));
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesActivity = activityFilter === "all" || String(r.activityId) === activityFilter;
      const matchesSource = sourceFilter === "all" || r.source === sourceFilter;
      const matchesAgency = agencyFilter === "all" || String(r.agencyId) === agencyFilter;
      const matchesPrice = (() => {
        if (!priceMinFilter && !priceMaxFilter) return true;
        const price = r.priceTl || 0;
        const min = priceMinFilter ? parseInt(priceMinFilter) : 0;
        const max = priceMaxFilter ? parseInt(priceMaxFilter) : Infinity;
        return price >= min && price <= max;
      })();
      const matchesDate = (() => {
        if (dateRangeFilter.from || dateRangeFilter.to) {
          const reservationDate = new Date(r.date);
          if (dateRangeFilter.from && dateRangeFilter.to) {
            return reservationDate >= dateRangeFilter.from && reservationDate <= dateRangeFilter.to;
          } else if (dateRangeFilter.from) {
            return reservationDate >= dateRangeFilter.from;
          }
        }
        return !dateFilter || r.date === dateFilter;
      })();
      return matchesSearch && matchesStatus && matchesActivity && matchesDate && matchesSource && matchesAgency && matchesPrice;
    })
    .sort((a, b) => {
      const getActivityName = (id: number | null) => activities?.find(act => act.id === id)?.name || '';
      
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime() || 
                 (a.time || '').localeCompare(b.time || '');
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime() || 
                 (a.time || '').localeCompare(b.time || '');
        case "name-asc":
          return a.customerName.localeCompare(b.customerName, 'tr');
        case "name-desc":
          return b.customerName.localeCompare(a.customerName, 'tr');
        case "activity-asc":
          return getActivityName(a.activityId).localeCompare(getActivityName(b.activityId), 'tr') ||
                 new Date(b.date).getTime() - new Date(a.date).getTime();
        case "activity-desc":
          return getActivityName(b.activityId).localeCompare(getActivityName(a.activityId), 'tr') ||
                 new Date(b.date).getTime() - new Date(a.date).getTime();
        case "status":
          const statusOrder = { confirmed: 1, pending: 2, cancelled: 3 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 4) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 4) ||
                 new Date(b.date).getTime() - new Date(a.date).getTime();
        case "price-desc":
          return (b.priceTl || 0) - (a.priceTl || 0);
        case "price-asc":
          return (a.priceTl || 0) - (b.priceTl || 0);
        case "created-desc":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "created-asc":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
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
            <Popover open={showNewReservations} onOpenChange={setShowNewReservations}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="relative"
                  data-testid="button-new-reservations"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Yeni Rezervasyonlar
                  {unseenReservations.length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]"
                    >
                      {unseenReservations.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">Yeni Rezervasyonlar</span>
                  {unseenReservations.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={markReservationsAsSeen}>
                      Tümünü Gördüm
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {unseenReservations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Yeni rezervasyon yok
                    </div>
                  ) : (
                    <div className="divide-y">
                      {unseenReservations.slice(0, 10).map(r => (
                        <div 
                          key={r.id} 
                          className="p-3 hover-elevate cursor-pointer"
                          onClick={() => {
                            setSelectedReservation(r);
                            setShowNewReservations(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.customerName}</span>
                            <Badge variant="secondary" className="text-[10px]">{r.quantity} kişi</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {activities?.find(a => a.id === r.activityId)?.name || "Bilinmiyor"} - {format(new Date(r.date), 'd MMM', { locale: tr })} {r.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/reservation-requests')}
                  className="relative"
                  data-testid="button-reservation-requests"
                >
                  <Handshake className="h-4 w-4 mr-2" />
                  Rez. Talepleri
                  {pendingRequestsCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]"
                    >
                      {pendingRequestsCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Is ortaklarindan gelen rezervasyon taleplerini goruntule</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-export">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Rezervasyonları dışa aktar</TooltipContent>
              </Tooltip>
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
              onMoveSuccess={openMoveNotification}
            />

            {/* Customer History Dialog */}
            <Dialog open={!!customerHistoryPhone} onOpenChange={() => setCustomerHistoryPhone(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Müşteri Geçmişi: {customerHistoryName}
                  </DialogTitle>
                  <DialogDescription>{customerHistoryPhone}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {customerHistory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Kayıt bulunamadı.</p>
                  ) : (
                    customerHistory.map((r) => (
                      <Card key={r.id} className={`p-3 ${r.status === 'cancelled' ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant={r.status === 'confirmed' ? 'default' : r.status === 'cancelled' ? 'destructive' : 'secondary'}>
                              {r.status === 'confirmed' ? 'Onaylı' : r.status === 'cancelled' ? 'İptal' : 'Beklemede'}
                            </Badge>
                            <span className="font-medium">{activities?.find(a => a.id === r.activityId)?.name || 'Aktivite'}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(r.date), "d MMMM yyyy", { locale: tr })} • {r.time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2 text-sm">
                          <span>{r.quantity} kişi</span>
                          <span className="text-muted-foreground">
                            {r.priceTl ? `${r.priceTl.toLocaleString('tr-TR')} TL` : ''}
                            {r.priceTl && r.priceUsd ? ' / ' : ''}
                            {r.priceUsd ? `$${r.priceUsd}` : ''}
                          </span>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  <p>Toplam {customerHistory.length} rezervasyon</p>
                  <p>Onaylı: {customerHistory.filter(r => r.status === 'confirmed').length} • 
                     Beklemede: {customerHistory.filter(r => r.status === 'pending').length} • 
                     İptal: {customerHistory.filter(r => r.status === 'cancelled').length}</p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Move Notification Dialog */}
            <Dialog open={!!moveNotification} onOpenChange={(open) => !open && setMoveNotification(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bilgilendirme Gönder</DialogTitle>
                </DialogHeader>
                {moveNotification && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Rezervasyon başarıyla güncellendi. Müşteriye bildirim göndermek ister misiniz?
                    </p>
                    
                    <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">{moveNotification.reservation.customerName}</p>
                            <p className="text-sm text-muted-foreground">{moveNotification.reservation.customerPhone}</p>
                          </div>
                        </div>
                        <Textarea
                          value={moveCustomerMsg}
                          onChange={(e) => setMoveCustomerMsg(e.target.value)}
                          rows={4}
                          className="text-sm"
                          placeholder="Müşteriye gönderilecek mesaj..."
                        />
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={async () => {
                            try {
                              await fetch('/api/whatsapp/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  to: moveNotification.reservation.customerPhone,
                                  message: moveCustomerMsg
                                })
                              });
                              toast({ title: "Gönderildi", description: "Müşteriye bildirim gönderildi." });
                            } catch {
                              toast({ title: "Hata", description: "Mesaj gönderilemedi.", variant: "destructive" });
                            }
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Müşteriye Gönder
                        </Button>
                      </div>
                    </Card>

                    {agencies.length > 0 && (
                      <Card className="p-4 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                              <Building className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium">Acenta Bildirimi</p>
                              <Select value={moveAgencyId} onValueChange={setMoveAgencyId}>
                                <SelectTrigger className="w-48 h-8">
                                  <SelectValue placeholder="Acenta seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {agencies.map((a) => (
                                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Textarea
                            value={moveAgencyMsg}
                            onChange={(e) => setMoveAgencyMsg(e.target.value)}
                            rows={3}
                            className="text-sm"
                            placeholder="Acentaya gönderilecek mesaj..."
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={!moveAgencyId}
                            onClick={async () => {
                              const agency = agencies.find(a => a.id === Number(moveAgencyId));
                              if (!agency?.contactInfo) {
                                toast({ title: "Hata", description: "Acenta iletişim bilgisi bulunamadı.", variant: "destructive" });
                                return;
                              }
                              try {
                                await fetch('/api/whatsapp/send', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    to: agency.contactInfo,
                                    message: moveAgencyMsg
                                  })
                                });
                                toast({ title: "Gönderildi", description: "Acentaya bildirim gönderildi." });
                              } catch {
                                toast({ title: "Hata", description: "Mesaj gönderilemedi.", variant: "destructive" });
                              }
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Acentaya Gönder
                          </Button>
                        </div>
                      </Card>
                    )}

                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => setMoveNotification(null)}>
                        Kapat
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Bugün</p>
                  <p className="text-2xl font-bold">{analytics.today.count}</p>
                  <p className="text-xs text-muted-foreground">{analytics.today.guests} kişi</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              {analytics.today.revenueTl > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.today.revenueTl.toLocaleString('tr-TR')} TL
                  {analytics.today.revenueUsd > 0 && ` / $${analytics.today.revenueUsd}`}
                </p>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 h-auto mt-2 text-xs text-primary"
                onClick={() => {
                  setViewMode("list");
                  setCurrentDate(new Date());
                  setDateFilter(format(new Date(), 'yyyy-MM-dd'));
                  setDateRangeFilter({ from: undefined, to: undefined });
                  setSearch("");
                }}
                data-testid="button-today-reservations"
              >
                <List className="h-3 w-3 mr-1" />
                Bugünün Rezervasyonlarını Gör
              </Button>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Bu Hafta</p>
                  <p className="text-2xl font-bold">{analytics.thisWeek.count}</p>
                  <p className="text-xs text-muted-foreground">{analytics.thisWeek.guests} kişi</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {analytics.thisWeek.growth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs ${analytics.thisWeek.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.thisWeek.growth >= 0 ? '+' : ''}{analytics.thisWeek.growth}% geçen haftaya göre
                </span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Bu Ay Gelir</p>
                  <p className="text-xl font-bold">{analytics.thisMonth.revenueTl.toLocaleString('tr-TR')} <span className="text-sm font-normal">TL</span></p>
                  <p className="text-lg font-semibold text-muted-foreground">${analytics.thisMonth.revenueUsd.toLocaleString('en-US')} <span className="text-xs font-normal">USD</span></p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {analytics.thisMonth.growth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs ${analytics.thisMonth.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.thisMonth.growth >= 0 ? '+' : ''}{analytics.thisMonth.growth}% geçen aya göre
                </span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Onay Bekleyen</p>
                  <p className="text-2xl font-bold">{analytics.pendingCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.pendingReservationsCount} rez. + {pendingRequestsCount} talep
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              {analytics.pendingCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-auto mt-2 text-xs text-primary"
                  onClick={() => {
                    setStatusFilter("pending");
                    setViewMode("list");
                  }}
                >
                  Bekleyenleri goster
                </Button>
              )}
            </Card>
          </div>
        )}

        {/* Conflict Warnings */}
        {customerConflicts.length > 0 && (
          <Card className="p-3 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Çakışma Uyarısı</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    {customerConflicts.length} müşterinin aynı gün farklı aktivitelerde rezervasyonu var.
                    {customerConflicts.slice(0, 2).map((c, i) => (
                      <span key={i}> {c.customer} ({c.reservations.length} rez.)</span>
                    ))}
                    {customerConflicts.length > 2 && <span> ve {customerConflicts.length - 2} diğer...</span>}
                  </p>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0 bg-white dark:bg-background">
                    Çakışmaları Gör
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Çakışan Rezervasyonlar</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {customerConflicts.map((conflict, idx) => (
                      <Card key={idx} className="p-3">
                        <p className="font-medium text-sm mb-2">{conflict.customer}</p>
                        <div className="space-y-2">
                          {conflict.reservations.map((r) => (
                            <div 
                              key={r.id} 
                              className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50 cursor-pointer hover-elevate"
                              onClick={() => setSelectedReservation(r)}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{r.customerName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {activities?.find(a => a.id === r.activityId)?.name} - {format(new Date(r.date), "d MMM yyyy", { locale: tr })} {r.time}
                                </p>
                              </div>
                              <Badge variant={r.status === 'confirmed' ? 'default' : r.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px]">
                                {r.status === 'confirmed' ? 'Onaylı' : r.status === 'cancelled' ? 'İptal' : 'Beklemede'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="p-3 bg-primary/5 border-primary/20 sticky top-0 z-40">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedIds.size === filteredReservations.length}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">{selectedIds.size} seçili</span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-3 w-3 mr-1" />
                  Temizle
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: 'confirmed' })}
                  disabled={bulkStatusMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Onayla
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: 'cancelled' })}
                  disabled={bulkStatusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  İptal Et
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (confirm(`${selectedIds.size} rezervasyonu silmek istediğinize emin misiniz?`)) {
                      bulkDeleteMutation.mutate(Array.from(selectedIds));
                    }
                  }}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Sil
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const selected = reservations?.filter(r => selectedIds.has(r.id)) || [];
                    const phones = Array.from(new Set(selected.map(r => r.customerPhone)));
                    if (phones.length === 0) {
                      toast({ title: "Uyarı", description: "Seçili rezervasyon bulunamadı.", variant: "destructive" });
                      return;
                    }
                    // Set initial template type based on first selected reservation's status
                    const firstStatus = selected[0]?.status || "confirmed";
                    const templateType = firstStatus === "cancelled" ? "cancelled" : firstStatus === "pending" ? "pending" : "confirmed";
                    setBulkTemplateType(templateType);
                    
                    // Generate message from appropriate template
                    const templates = bulkTemplatesSetting?.value ? JSON.parse(bulkTemplatesSetting.value) : null;
                    const defaultTemplates = {
                      confirmed: "Merhaba {isim},\n\nRezervasyon onaylandı!\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nİyi günler dileriz.",
                      pending: "Merhaba {isim},\n\nRezervasyon talebiniz değerlendiriliyor.\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nEn kısa sürede bilgilendirme yapılacaktır.",
                      cancelled: "Merhaba {isim},\n\nÜzgünüz, rezervasyonunuz iptal edilmiştir.\nAktivite: {aktivite}\nTarih: {tarih}\n\nSorularınız için bizimle iletişime geçebilirsiniz."
                    };
                    const templateData = templates?.[templateType];
                    const template = typeof templateData === 'string' ? templateData : (templateData?.content || defaultTemplates[templateType]);
                    
                    let defaultMsg: string;
                    if (selected.length === 1) {
                      const r = selected[0];
                      const activityName = activities?.find(a => a.id === r.activityId)?.name || "";
                      defaultMsg = template
                        .replace(/{isim}/g, r.customerName)
                        .replace(/{tarih}/g, format(new Date(r.date), "d MMMM yyyy", { locale: tr }))
                        .replace(/{saat}/g, r.time || "")
                        .replace(/{aktivite}/g, activityName);
                    } else {
                      // For multiple reservations, use template without specific values
                      defaultMsg = template
                        .replace(/{isim}/g, "")
                        .replace(/{tarih}/g, "")
                        .replace(/{saat}/g, "")
                        .replace(/{aktivite}/g, "")
                        .replace(/Aktivite:\s*\n/g, "")
                        .replace(/Tarih:\s*\n/g, "")
                        .replace(/Saat:\s*\n/g, "")
                        .replace(/\n\n+/g, "\n\n")
                        .trim();
                    }
                    setBulkWhatsAppMessage(defaultMsg);
                    setBulkWhatsAppOpen(true);
                  }}
                  data-testid="button-bulk-whatsapp"
                >
                  <Send className="h-4 w-4 mr-1" />
                  WhatsApp Bildir
                </Button>
              </div>
            </div>
          </Card>
        )}

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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearDateFilter}
                    data-testid="button-clear-date-filter"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Filtreyi Kaldır
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tarih filtresini temizle</TooltipContent>
              </Tooltip>
            </div>
          </Card>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="p-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Telefon, İsim Soyisim veya Rezervasyon No ile ara..." 
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
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-sort-by">
                  <ArrowUpDown className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Tarih (Yeni-Eski)</SelectItem>
                  <SelectItem value="date-asc">Tarih (Eski-Yeni)</SelectItem>
                  <SelectItem value="name-asc">Müşteri (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Müşteri (Z-A)</SelectItem>
                  <SelectItem value="activity-asc">Aktivite (A-Z)</SelectItem>
                  <SelectItem value="activity-desc">Aktivite (Z-A)</SelectItem>
                  <SelectItem value="status">Durum</SelectItem>
                  <SelectItem value="price-desc">Fiyat (Yüksek-Düşük)</SelectItem>
                  <SelectItem value="price-asc">Fiyat (Düşük-Yüksek)</SelectItem>
                  <SelectItem value="created-desc">Oluşturma (Yeni-Eski)</SelectItem>
                  <SelectItem value="created-asc">Oluşturma (Eski-Yeni)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="min-w-[160px] w-auto max-w-[260px]" data-testid="select-list-activity">
                  <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Doluluk Oranı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Aktiviteler</SelectItem>
                  {(activities || []).map(a => {
                    // Calculate occupancy for current month for this activity
                    const monthStart = startOfMonth(currentDate);
                    const monthEnd = endOfMonth(currentDate);
                    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    
                    let totalCapacity = 0;
                    let totalBooked = 0;
                    const capacity = (a as any)?.defaultCapacity || 10;
                    
                    monthDays.forEach(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayReservations = (reservations || []).filter(
                        r => r.date === dateStr && r.activityId === a.id && r.status !== 'cancelled'
                      );
                      const booked = dayReservations.reduce((sum, r) => sum + r.quantity, 0);
                      totalCapacity += capacity;
                      totalBooked += booked;
                    });
                    
                    const occupancy = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
                    
                    return (
                      <SelectItem key={a.id} value={String(a.id)}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span>{a.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ml-2 ${
                              occupancy >= 100 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              occupancy >= 80 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              occupancy >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            %{occupancy}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={showAdvancedFilters || sourceFilter !== 'all' || agencyFilter !== 'all' || priceMinFilter || priceMaxFilter ? "default" : "outline"} 
                    size="sm"
                  >
                    <MoreVertical className="h-4 w-4 mr-1" />
                    Filtreler
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="end">
                  <div className="space-y-3">
                    <div className="font-medium text-sm">Gelişmiş Filtreler</div>
                    <div className="space-y-2">
                      <Label className="text-xs">Kaynak</Label>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          <SelectItem value="manual">Manuel</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="web">WooCommerce</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Acenta</Label>
                      <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          {agencies.map(a => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Fiyat Aralığı (TL)</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder="Min" 
                          value={priceMinFilter}
                          onChange={(e) => setPriceMinFilter(e.target.value)}
                          className="h-8"
                        />
                        <Input 
                          type="number" 
                          placeholder="Max" 
                          value={priceMaxFilter}
                          onChange={(e) => setPriceMaxFilter(e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Kayıtlı Filtreler</span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              <Plus className="h-3 w-3 mr-1" />
                              Kaydet
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Filtreyi Kaydet</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const name = (e.target as any).filterName.value;
                              if (name) saveCurrentFilter(name);
                            }}>
                              <Input name="filterName" placeholder="Filtre adı" className="mb-4" />
                              <DialogFooter>
                                <Button type="submit" size="sm">Kaydet</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {savedFilters.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Kayıtlı filtre yok</p>
                      ) : (
                        <div className="space-y-1">
                          {savedFilters.map((f, i) => (
                            <div key={i} className="flex items-center justify-between hover-elevate rounded p-1">
                              <button 
                                type="button"
                                className="text-xs text-left flex-1"
                                onClick={() => loadSavedFilter(f)}
                              >
                                {f.name}
                              </button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5"
                                onClick={() => deleteSavedFilter(f.name)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSourceFilter("all");
                        setAgencyFilter("all");
                        setPriceMinFilter("");
                        setPriceMaxFilter("");
                      }}
                    >
                      Filtreleri Temizle
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {viewMode === "list" && (
                <>
                  <Popover>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button 
                            variant={(dateRangeFilter.from || dateRangeFilter.to) ? "default" : "outline"} 
                            size="sm"
                            className="gap-2"
                            data-testid="button-list-date-picker"
                          >
                            <Calendar className="h-4 w-4" />
                            {dateRangeFilter.from && dateRangeFilter.to ? (
                              `${format(dateRangeFilter.from, 'd MMM', { locale: tr })} - ${format(dateRangeFilter.to, 'd MMM', { locale: tr })}`
                            ) : dateRangeFilter.from ? (
                              `${format(dateRangeFilter.from, 'd MMM', { locale: tr })} -`
                            ) : 'Tarih Aralığı'}
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Tarih aralığı seç</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-2 border-b">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => {
                            setDateRangeFilter({ from: undefined, to: undefined });
                            setDateFilter("");
                          }}
                        >
                          Tüm tarihler
                        </Button>
                      </div>
                      <CalendarPicker
                        mode="range"
                        selected={dateRangeFilter}
                        onSelect={(range) => {
                          if (range) {
                            setDateRangeFilter({ from: range.from, to: range.to });
                            setDateFilter("");
                          }
                        }}
                        numberOfMonths={2}
                        locale={tr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {(dateRangeFilter.from || dateRangeFilter.to) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDateRangeFilter({ from: undefined, to: undefined });
                        setDateFilter("");
                      }}
                      className="text-muted-foreground"
                      data-testid="button-clear-date-filter"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              <div className="flex border rounded-md">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "calendar" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("calendar")}
                      className="rounded-r-none"
                      data-testid="button-view-calendar"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Takvim görünümü</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="rounded-l-none border-l"
                      data-testid="button-view-list"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Liste görünümü</TooltipContent>
                </Tooltip>
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
          <ReservationTable 
            reservations={filteredReservations} 
            onReservationSelect={setSelectedReservation}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onSelectAll={selectAll}
            onCustomerClick={(phone, name) => {
              setCustomerHistoryPhone(phone);
              setCustomerHistoryName(name);
            }}
            onWhatsAppNotify={(reservation) => {
              // Select this single reservation and open WhatsApp dialog
              setSelectedIds(new Set([reservation.id]));
              
              // Generate message from template based on status
              const templates = bulkTemplatesSetting?.value ? JSON.parse(bulkTemplatesSetting.value) : null;
              const defaultTemplates = {
                confirmed: "Merhaba {isim},\n\nRezervasyon onaylandı!\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nİyi günler dileriz.",
                pending: "Merhaba {isim},\n\nRezervasyon talebiniz değerlendiriliyor.\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nEn kısa sürede bilgilendirme yapılacaktır.",
                cancelled: "Merhaba {isim},\n\nÜzgünüz, rezervasyonunuz iptal edilmiştir.\nAktivite: {aktivite}\nTarih: {tarih}\n\nSorularınız için bizimle iletişime geçebilirsiniz."
              };
              const templateType = reservation.status === "cancelled" ? "cancelled" : reservation.status === "pending" ? "pending" : "confirmed";
              setBulkTemplateType(templateType);
              
              const templateData = templates?.[templateType];
              const template = typeof templateData === 'string' ? templateData : (templateData?.content || defaultTemplates[templateType]);
              
              const activityName = activities?.find(a => a.id === reservation.activityId)?.name || "";
              const msg = template
                .replace(/{isim}/g, reservation.customerName)
                .replace(/{tarih}/g, format(new Date(reservation.date), "d MMMM yyyy", { locale: tr }))
                .replace(/{saat}/g, reservation.time || "")
                .replace(/{aktivite}/g, activityName);
              
              setBulkWhatsAppMessage(msg);
              setBulkWhatsAppOpen(true);
            }}
          />
        ) : (
          <>
            <BigCalendar 
              reservations={reservations || []}
              activities={activities || []}
              packageTours={packageTours}
              holidays={holidays}
              agencies={agencies}
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
              packageTourFilter={packageTourFilter}
              onPackageTourFilterChange={setPackageTourFilter}
            />
            <RecentReservations 
              reservations={reservations || []} 
              activities={activities || []}
            />
          </>
        )}

        {/* Bulk WhatsApp Notification Dialog */}
        <Dialog open={bulkWhatsAppOpen} onOpenChange={(open) => {
          if (!open) {
            setBulkWhatsAppOpen(false);
            setBulkWhatsAppMessage("");
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-green-600" />
                Toplu WhatsApp Bildirimi
              </DialogTitle>
              <DialogDescription>
                Seçilen rezervasyonlardaki müşterilere WhatsApp mesajı gönderin
              </DialogDescription>
            </DialogHeader>
            
            {(() => {
              const selected = reservations?.filter(r => selectedIds.has(r.id)) || [];
              const uniquePhones = Array.from(new Set(selected.map(r => r.customerPhone)));
              
              return (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span><strong>{selected.length}</strong> rezervasyon seçildi</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span><strong>{uniquePhones.length}</strong> farklı numaraya gönderilecek</span>
                    </div>
                  </div>

                  {uniquePhones.length > 0 && uniquePhones.length <= 5 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {selected.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{r.customerPhone}</Badge>
                          <span>{r.customerName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Mesaj Şablonu</Label>
                    {(() => {
                      const templates = bulkTemplatesSetting?.value ? JSON.parse(bulkTemplatesSetting.value) : null;
                      const defaultTemplates = {
                        confirmed: { label: "Onaylandı", content: "Merhaba {isim},\n\nRezervasyon onaylandı!\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nİyi günler dileriz." },
                        pending: { label: "Beklemede", content: "Merhaba {isim},\n\nRezervasyon talebiniz değerlendiriliyor.\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nEn kısa sürede bilgilendirme yapılacaktır." },
                        cancelled: { label: "İptal", content: "Merhaba {isim},\n\nÜzgünüz, rezervasyonunuz iptal edilmiştir.\nAktivite: {aktivite}\nTarih: {tarih}\n\nSorularınız için bizimle iletişime geçebilirsiniz." }
                      };
                      const getTemplateData = (type: "confirmed" | "pending" | "cancelled") => {
                        const t = templates?.[type];
                        if (!t) return defaultTemplates[type];
                        if (typeof t === 'string') return { label: defaultTemplates[type].label, content: t };
                        return { label: t.label || defaultTemplates[type].label, content: t.content || defaultTemplates[type].content };
                      };
                      const applyTemplate = (type: "confirmed" | "pending" | "cancelled") => {
                        setBulkTemplateType(type);
                        const { content: template } = getTemplateData(type);
                        if (selected.length === 1) {
                          const r = selected[0];
                          const activityName = activities?.find(a => a.id === r.activityId)?.name || "";
                          setBulkWhatsAppMessage(template.replace(/{isim}/g, r.customerName).replace(/{tarih}/g, format(new Date(r.date), "d MMMM yyyy", { locale: tr })).replace(/{saat}/g, r.time || "").replace(/{aktivite}/g, activityName));
                        } else {
                          setBulkWhatsAppMessage(template.replace(/{isim}/g, "").replace(/{tarih}/g, "").replace(/{saat}/g, "").replace(/{aktivite}/g, "").replace(/Aktivite:\s*\n/g, "").replace(/Tarih:\s*\n/g, "").replace(/Saat:\s*\n/g, "").replace(/\n\n+/g, "\n\n").trim());
                        }
                      };
                      return (
                        <div className="flex gap-2">
                          <Button
                            variant={bulkTemplateType === "confirmed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => applyTemplate("confirmed")}
                            className="flex-1"
                            data-testid="button-template-confirmed"
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            {getTemplateData("confirmed").label}
                          </Button>
                          <Button
                            variant={bulkTemplateType === "pending" ? "default" : "outline"}
                            size="sm"
                            onClick={() => applyTemplate("pending")}
                            className="flex-1"
                            data-testid="button-template-pending"
                          >
                            <Clock className="h-4 w-4 mr-1 text-yellow-600" />
                            {getTemplateData("pending").label}
                          </Button>
                          <Button
                            variant={bulkTemplateType === "cancelled" ? "default" : "outline"}
                            size="sm"
                            onClick={() => applyTemplate("cancelled")}
                            className="flex-1"
                            data-testid="button-template-cancelled"
                          >
                            <XCircle className="h-4 w-4 mr-1 text-red-600" />
                            {getTemplateData("cancelled").label}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <Label>Mesaj İçeriği</Label>
                    <Textarea
                      value={bulkWhatsAppMessage}
                      onChange={(e) => setBulkWhatsAppMessage(e.target.value)}
                      className="min-h-[150px]"
                      placeholder="Müşterilere gönderilecek mesajı yazın..."
                      data-testid="textarea-bulk-whatsapp-message"
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setBulkWhatsAppOpen(false);
                        setBulkWhatsAppMessage("");
                      }}
                    >
                      İptal
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (!bulkWhatsAppMessage.trim()) {
                          toast({ title: "Hata", description: "Mesaj içeriği boş olamaz.", variant: "destructive" });
                          return;
                        }
                        
                        setBulkWhatsAppSending(true);
                        let successCount = 0;
                        let errorCount = 0;
                        
                        for (const phone of uniquePhones) {
                          try {
                            await apiRequest('POST', '/api/send-whatsapp-custom-message', {
                              phone,
                              message: bulkWhatsAppMessage
                            });
                            successCount++;
                          } catch {
                            errorCount++;
                          }
                        }
                        
                        setBulkWhatsAppSending(false);
                        setBulkWhatsAppOpen(false);
                        setBulkWhatsAppMessage("");
                        setSelectedIds(new Set());
                        
                        if (errorCount === 0) {
                          toast({ 
                            title: "Başarılı", 
                            description: `${successCount} kişiye WhatsApp bildirimi gönderildi.`
                          });
                        } else {
                          toast({ 
                            title: "Kısmen Başarılı", 
                            description: `${successCount} başarılı, ${errorCount} başarısız gönderim.`,
                            variant: "destructive"
                          });
                        }
                      }}
                      disabled={bulkWhatsAppSending || !bulkWhatsAppMessage.trim()}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-send-bulk-whatsapp"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {bulkWhatsAppSending ? "Gönderiliyor..." : `${uniquePhones.length} Kişiye Gönder`}
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

interface BigCalendarProps {
  reservations: Reservation[];
  activities: Activity[];
  packageTours: PackageTour[];
  holidays: Holiday[];
  agencies: Agency[];
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
  packageTourFilter: string;
  onPackageTourFilterChange: (value: string) => void;
}

function BigCalendar({ 
  reservations, 
  activities, 
  packageTours,
  holidays,
  agencies,
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
  onActivityFilterChange,
  packageTourFilter,
  onPackageTourFilterChange
}: BigCalendarProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [overflowDialogDate, setOverflowDialogDate] = useState<string | null>(null);
  const [draggedReservation, setDraggedReservation] = useState<Reservation | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverTime, setDragOverTime] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ reservation: Reservation; newDate: string; newTime?: string; isPackage?: boolean; packageCount?: number } | null>(null);
  const [showMoveNotification, setShowMoveNotification] = useState<{ reservation: Reservation; oldDate: string; newDate: string; oldTime?: string; newTime?: string; movedCount?: number } | null>(null);
  const [moveCustomerMessage, setMoveCustomerMessage] = useState("");
  const [moveAgencyMessage, setMoveAgencyMessage] = useState("");
  const [moveSelectedAgencyId, setMoveSelectedAgencyId] = useState<string>("");
  const { toast } = useToast();

  // Helper function to generate customer notification message
  const generateCustomerMessage = (customerName: string, oldDate: string, newDate: string, oldTime?: string, newTime?: string) => {
    const oldDateFormatted = format(new Date(oldDate), "d MMMM yyyy", { locale: tr });
    const newDateFormatted = format(new Date(newDate), "d MMMM yyyy", { locale: tr });
    let message = `Merhaba ${customerName},\n\nRezervasyonunuz güncellenmistir.\n\n`;
    if (oldDate !== newDate) {
      message += `Eski tarih: ${oldDateFormatted}\nYeni tarih: ${newDateFormatted}\n`;
    }
    if (oldTime && newTime && oldTime !== newTime) {
      message += `Eski saat: ${oldTime}\nYeni saat: ${newTime}\n`;
    }
    message += `\nSorularınız için bize bu numaradan yazabilirsiniz.\n\nSky Fethiye`;
    return message;
  };

  // Helper function to generate agency notification message
  const generateAgencyMessage = (customerName: string, oldDate: string, newDate: string, oldTime?: string, newTime?: string) => {
    const oldDateFormatted = format(new Date(oldDate), "d MMMM yyyy", { locale: tr });
    const newDateFormatted = format(new Date(newDate), "d MMMM yyyy", { locale: tr });
    let message = `Rezervasyon Degisikligi Bildirimi\n\nMüşteri: ${customerName}\n`;
    if (oldDate !== newDate) {
      message += `Eski Tarih: ${oldDateFormatted}\nYeni Tarih: ${newDateFormatted}\n`;
    }
    if (oldTime && newTime && oldTime !== newTime) {
      message += `Eski Saat: ${oldTime}\nYeni Saat: ${newTime}\n`;
    }
    message += `\nSky Fethiye`;
    return message;
  };

  // Helper to open move notification dialog with default messages
  const openMoveNotificationDialog = (reservation: Reservation, oldDate: string, newDate: string, oldTime?: string, newTime?: string, movedCount?: number) => {
    setMoveCustomerMessage(generateCustomerMessage(reservation.customerName, oldDate, newDate, oldTime, newTime));
    setMoveAgencyMessage(generateAgencyMessage(reservation.customerName, oldDate, newDate, oldTime, newTime));
    setMoveSelectedAgencyId(reservation.agencyId ? String(reservation.agencyId) : "");
    setShowMoveNotification({ reservation, oldDate, newDate, oldTime, newTime, movedCount });
  };
  
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/reservations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, newDate, oldDate, newTime, oldTime, reservation }: { id: number; newDate: string; oldDate: string; newTime?: string; oldTime?: string; reservation: Reservation }) => {
      const updates: { date?: string; time?: string } = {};
      if (newDate !== oldDate) updates.date = newDate;
      if (newTime && newTime !== oldTime) updates.time = newTime;
      return apiRequest('PATCH', `/api/reservations/${id}`, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      const description = variables.newTime && variables.newTime !== variables.oldTime 
        ? `Rezervasyon ${variables.newDate !== variables.oldDate ? 'tarihi ve ' : ''}saati güncellendi.`
        : "Rezervasyon tarihi güncellendi.";
      toast({ title: "Başarılı", description });
      openMoveNotificationDialog(
        variables.reservation,
        variables.oldDate,
        variables.newDate,
        variables.oldTime,
        variables.newTime
      );
      setPendingMove(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme yapılamadı.", variant: "destructive" });
      setPendingMove(null);
    },
  });

  // Package tour shift mutation - moves all reservations in the package
  const packageShiftMutation = useMutation({
    mutationFn: async ({ packageTourId, orderNumber, offsetDays, reservation }: { 
      packageTourId: number; 
      orderNumber: string; 
      offsetDays: number;
      reservation: Reservation;
    }) => {
      return apiRequest('POST', '/api/package-reservations/shift', { packageTourId, orderNumber, offsetDays });
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: "Başarılı", description: `${data?.reservations?.length || 0} rezervasyon taşındı.` });
      
      const oldDate = variables.reservation.date;
      const newDate = new Date(oldDate);
      newDate.setDate(newDate.getDate() + variables.offsetDays);
      
      openMoveNotificationDialog(
        variables.reservation,
        oldDate,
        newDate.toISOString().split('T')[0],
        undefined,
        undefined,
        data?.reservations?.length
      );
      setPendingMove(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Paket tur taşınamadı.", variant: "destructive" });
      setPendingMove(null);
    },
  });

  // WhatsApp customer notification mutation
  const customerNotificationMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      return apiRequest('POST', '/api/send-whatsapp-custom-message', { phone, message });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Müşteriye WhatsApp bildirimi gönderildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "WhatsApp mesajı gönderilemedi.", variant: "destructive" });
    }
  });

  // WhatsApp agency notification mutation
  const agencyNotificationMutation = useMutation({
    mutationFn: async ({ agencyId, message }: { agencyId: number; message: string }) => {
      // Get agency contact info
      const agencyRes = await fetch(`/api/agencies/${agencyId}`);
      if (!agencyRes.ok) throw new Error('Acenta bilgisi alınamadı');
      const agency = await agencyRes.json();
      
      if (!agency.contactInfo) {
        throw new Error('Acenta iletişim bilgisi bulunamadı');
      }
      
      return apiRequest('POST', '/api/send-whatsapp-custom-message', { phone: agency.contactInfo, message });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Acentaya bildirim gönderildi." });
    },
    onError: (err) => {
      const errorMsg = err instanceof Error ? err.message : 'WhatsApp mesajı gönderilemedi';
      toast({ title: "Hata", description: errorMsg, variant: "destructive" });
    }
  });

  const handleDragStart = (e: React.DragEvent, reservation: Reservation) => {
    setDraggedReservation(reservation);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(reservation.id));
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string, timeStr?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
    setDragOverTime(timeStr || null);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
    setDragOverTime(null);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, timeStr?: string) => {
    e.preventDefault();
    setDragOverDate(null);
    setDragOverTime(null);
    
    if (!draggedReservation) {
      return;
    }
    
    const dateChanged = draggedReservation.date !== dateStr;
    // Time changed only if we're dropping on a specific time slot AND it's different from current time
    const timeChanged = timeStr !== undefined && draggedReservation.time !== timeStr;
    
    // For date-only drops (no timeStr), only check date change
    // For time slot drops (with timeStr), check either date or time changed
    if (!dateChanged && (timeStr === undefined || !timeChanged)) {
      setDraggedReservation(null);
      return;
    }
    
    // Check if this is a package tour reservation
    if (draggedReservation.packageTourId) {
      // Package tour requires order number for proper grouping
      if (!draggedReservation.orderNumber) {
        toast({ 
          title: "Taşıma Yapılamıyor", 
          description: "Paket tur rezervasyonlarını taşımak için sipariş numarası gerekli. Lütfen önce sipariş numarası ekleyin.", 
          variant: "destructive" 
        });
        setDraggedReservation(null);
        return;
      }
      
      // For package tours, only date changes are supported (time changes for individual items don't make sense)
      if (!dateChanged && timeChanged) {
        toast({ 
          title: "Bilgi", 
          description: "Paket tur rezervasyonlarında saat değişikliği için rezervasyon detaylarından düzenleme yapın.", 
        });
        setDraggedReservation(null);
        return;
      }
      
      // Count how many reservations are in this package group - ONLY by packageTourId + orderNumber
      const packageReservations = reservations.filter(r => 
        r.packageTourId === draggedReservation.packageTourId && 
        r.orderNumber === draggedReservation.orderNumber
      );
      
      setPendingMove({ 
        reservation: draggedReservation, 
        newDate: dateStr, 
        isPackage: true, 
        packageCount: packageReservations.length 
      });
    } else {
      // Single reservation move (date and/or time)
      setPendingMove({ 
        reservation: draggedReservation, 
        newDate: dateStr,
        newTime: timeStr
      });
    }
    setDraggedReservation(null);
  };

  const confirmMove = () => {
    if (pendingMove) {
      if (pendingMove.isPackage && pendingMove.reservation.packageTourId && pendingMove.reservation.orderNumber) {
        // Calculate offset days using UTC to avoid timezone issues
        const [oldYear, oldMonth, oldDay] = pendingMove.reservation.date.split('-').map(Number);
        const [newYear, newMonth, newDay] = pendingMove.newDate.split('-').map(Number);
        const oldDateUtc = Date.UTC(oldYear, oldMonth - 1, oldDay);
        const newDateUtc = Date.UTC(newYear, newMonth - 1, newDay);
        const offsetDays = Math.round((newDateUtc - oldDateUtc) / (1000 * 60 * 60 * 24));
        
        packageShiftMutation.mutate({
          packageTourId: pendingMove.reservation.packageTourId,
          orderNumber: pendingMove.reservation.orderNumber,
          offsetDays,
          reservation: pendingMove.reservation
        });
      } else {
        moveMutation.mutate({ 
          id: pendingMove.reservation.id, 
          newDate: pendingMove.newDate,
          oldDate: pendingMove.reservation.date,
          newTime: pendingMove.newTime,
          oldTime: pendingMove.reservation.time,
          reservation: pendingMove.reservation
        });
      }
    }
  };

  const cancelMove = () => {
    setPendingMove(null);
  };

  const handleDragEnd = () => {
    setDraggedReservation(null);
    setDragOverDate(null);
    setDragOverTime(null);
  };

  const getActivityName = (activityId: number | null) => {
    if (!activityId) return "Bilinmiyor";
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };

  const getActivityColor = (activityId: number | null) => {
    if (!activityId) return "bg-gray-100 text-gray-700 border-gray-200";
    const activity = activities.find(a => a.id === activityId);
    const colorName = (activity as any)?.color || "blue";
    const colorMap: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700 border-blue-200",
      purple: "bg-purple-100 text-purple-700 border-purple-200",
      green: "bg-green-100 text-green-700 border-green-200",
      orange: "bg-orange-100 text-orange-700 border-orange-200",
      pink: "bg-pink-100 text-pink-700 border-pink-200",
      cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
      red: "bg-red-100 text-red-700 border-red-200",
      yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
    return colorMap[colorName] || colorMap.blue;
  };

  const getPackageTourName = (packageTourId: number | null) => {
    if (!packageTourId) return null;
    return packageTours.find(p => p.id === packageTourId)?.name || null;
  };

  const filteredReservations = reservations.filter(r => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesActivity = activityFilter === "all" || String(r.activityId) === activityFilter;
    const matchesPackageTour = packageTourFilter === "all" || 
      (packageTourFilter === "none" && !r.packageTourId) ||
      String(r.packageTourId) === packageTourFilter;
    return matchesStatus && matchesActivity && matchesPackageTour;
  });

  const getReservationsForDate = (dateStr: string) => {
    return filteredReservations.filter(r => r.date === dateStr);
  };

  const groupReservations = (reservationList: Reservation[]) => {
    const packageGroups = new Map<string, Reservation[]>();
    const standaloneReservations: Reservation[] = [];
    
    reservationList.forEach(r => {
      if (r.packageTourId) {
        const groupKey = `${r.packageTourId}-${r.orderNumber || r.customerName}`;
        const existing = packageGroups.get(groupKey) || [];
        existing.push(r);
        packageGroups.set(groupKey, existing);
      } else {
        standaloneReservations.push(r);
      }
    });
    
    return { packageGroups, standaloneReservations };
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

  const getHolidayForDate = (dateStr: string): Holiday | null => {
    return holidays.find(h => {
      const holidayStart = h.startDate;
      const holidayEnd = h.endDate || h.startDate;
      return dateStr >= holidayStart && dateStr <= holidayEnd;
    }) || null;
  };

  const getCapacityPercentage = (dateStr: string): number => {
    const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
    let totalCapacity = 0;
    let totalBooked = 0;
    
    const filteredActivities = activityFilter 
      ? activities.filter(a => String(a.id) === activityFilter)
      : activities;
    
    filteredActivities.forEach(activity => {
      const capacity = (activity as any)?.defaultCapacity || 10;
      const booked = dayReservations.filter(r => r.activityId === activity.id).reduce((sum, r) => sum + r.quantity, 0);
      totalCapacity += capacity;
      totalBooked += booked;
    });
    
    return totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => onNavigate('prev')} data-testid="button-calendar-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Önceki {view === 'month' ? 'ay' : view === 'week' ? 'hafta' : 'gün'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => onNavigate('next')} data-testid="button-calendar-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sonraki {view === 'month' ? 'ay' : view === 'week' ? 'hafta' : 'gün'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={onGoToToday} data-testid="button-today">
                  Bugün
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bugüne git</TooltipContent>
            </Tooltip>
            
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2" data-testid="button-date-picker">
                      <CalendarDays className="h-4 w-4" />
                      <span className="capitalize font-semibold">{headerTitle}</span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Tarih seç</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => {
                    if (date) {
                      if (view === 'week') {
                        onDateSelect(startOfWeek(date, { weekStartsOn: 1 }));
                      } else {
                        onDateSelect(date);
                      }
                      setDatePickerOpen(false);
                    }
                  }}
                  modifiers={view === 'week' ? {
                    weekStart: (date) => date.getDay() === 1
                  } : undefined}
                  modifiersClassNames={view === 'week' ? {
                    weekStart: "font-bold text-primary"
                  } : undefined}
                  locale={tr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={activityFilter} onValueChange={onActivityFilterChange}>
              <SelectTrigger className="min-w-[180px] w-auto max-w-[280px]" data-testid="select-calendar-activity">
                <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="Aktivite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Aktiviteler</SelectItem>
                {activities.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={packageTourFilter} onValueChange={onPackageTourFilterChange}>
              <SelectTrigger className="min-w-[180px] w-auto max-w-[280px]" data-testid="select-calendar-package">
                <Package className="h-4 w-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="Paket Tur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Paketler</SelectItem>
                <SelectItem value="none">Paket Yok</SelectItem>
                {packageTours.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === "day" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onViewChange("day")}
                    className="rounded-r-none"
                    data-testid="button-view-day"
                  >
                    Gün
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Günlük görünüm</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onViewChange("week")}
                    className="rounded-none border-x"
                    data-testid="button-view-week"
                  >
                    Hafta
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Haftalık görünüm</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onViewChange("month")}
                    className="rounded-l-none"
                    data-testid="button-view-month"
                  >
                    Ay
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aylık görünüm</TooltipContent>
              </Tooltip>
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
            const holiday = getHolidayForDate(dateStr);
            const capacityPct = getCapacityPercentage(dateStr);

            return (
              <div 
                key={idx}
                className={`group/cell min-h-[120px] border-b border-r p-1 ${
                  !isCurrentMonth ? 'bg-muted/20' : ''
                } ${isDayToday ? 'bg-primary/5' : ''} ${holiday ? 'bg-red-50 dark:bg-red-900/20' : ''} ${dragOverDate === dateStr ? 'bg-primary/20 ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'} cursor-pointer transition-colors relative`}
                onClick={() => onDateClick(dateStr)}
                data-testid={`calendar-day-${dateStr}`}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${
                      isDayToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
                    } ${!isCurrentMonth ? 'text-muted-foreground' : ''} ${holiday ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {holiday && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[9px] text-red-600 dark:text-red-400 truncate max-w-[50px]">
                            {holiday.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{holiday.name}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
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
                  {(() => {
                    const { packageGroups, standaloneReservations } = groupReservations(dayReservations);
                    const maxVisible = 3;
                    
                    type DisplayEntry = { type: 'package'; key: string; reservations: Reservation[]; time: string } | { type: 'standalone'; reservation: Reservation; time: string };
                    const entries: DisplayEntry[] = [];
                    
                    packageGroups.forEach((groupRes, groupKey) => {
                      const earliestTime = groupRes.reduce((min, r) => r.time < min ? r.time : min, groupRes[0].time);
                      entries.push({ type: 'package', key: groupKey, reservations: groupRes, time: earliestTime });
                    });
                    
                    standaloneReservations.forEach(res => {
                      entries.push({ type: 'standalone', reservation: res, time: res.time });
                    });
                    
                    entries.sort((a, b) => a.time.localeCompare(b.time));
                    
                    const visibleEntries = entries.slice(0, maxVisible);
                    const remaining = Math.max(0, entries.length - maxVisible);
                    
                    return (
                      <>
                        {visibleEntries.map((entry, idx) => {
                          if (entry.type === 'package') {
                            const firstRes = entry.reservations[0];
                            return (
                              <div 
                                key={`pkg-${entry.key}`}
                                className="text-[10px] px-1 py-0.5 rounded truncate border-2 border-purple-400 bg-purple-50 dark:bg-purple-900/30 cursor-pointer hover:opacity-80 flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReservationSelect(firstRes);
                                }}
                              >
                                <Package className="h-3 w-3 text-purple-600 flex-shrink-0" />
                                <span className="text-purple-700 dark:text-purple-300 truncate">
                                  {firstRes.customerName.split(' ')[0]} ({entry.reservations.length})
                                </span>
                              </div>
                            );
                          } else {
                            const res = entry.reservation;
                            return (
                              <div 
                                key={res.id}
                                className={`text-[10px] px-1 py-0.5 rounded truncate border cursor-grab active:cursor-grabbing hover:opacity-80 ${getActivityColor(res.activityId)} ${
                                  res.status === 'cancelled' ? 'opacity-50 line-through' : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReservationSelect(res);
                                }}
                                data-testid={`reservation-${res.id}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, res)}
                              >
                                {res.time} {res.customerName.split(' ')[0]}
                              </div>
                            );
                          }
                        })}
                        {remaining > 0 && (
                          <button 
                            className="text-[10px] text-primary hover:underline px-1 text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverflowDialogDate(dateStr);
                            }}
                          >
                            +{remaining} daha
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
                {dayReservations.length === 0 && (
                  <div className="invisible group-hover/cell:visible absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center bg-background/80">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
                {capacityPct > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1">
                    <div 
                      className={`h-full transition-all ${capacityPct >= 80 ? 'bg-red-500' : capacityPct >= 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(capacityPct, 100)}%` }}
                    />
                  </div>
                )}
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
            const holiday = getHolidayForDate(dateStr);
            const capacityPct = getCapacityPercentage(dateStr);

            return (
              <div 
                key={idx}
                className={`group min-h-[400px] border-r p-2 ${isDayToday ? 'bg-primary/5' : ''} ${holiday ? 'bg-red-50 dark:bg-red-900/20' : ''} ${dragOverDate === dateStr ? 'bg-primary/20 ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'} cursor-pointer relative transition-colors`}
                onClick={() => onDateClick(dateStr)}
                data-testid={`calendar-week-day-${dateStr}`}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className="text-center pb-2 border-b mb-2">
                  <div className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: tr })}</div>
                  <div className={`text-lg font-semibold ${isDayToday ? 'text-primary' : ''} ${holiday ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  {holiday && (
                    <div className="text-[9px] text-red-600 dark:text-red-400 truncate">
                      {holiday.name}
                    </div>
                  )}
                  {totalPeople > 0 && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {totalPeople} kişi
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 overflow-y-auto max-h-[350px]">
                  {(() => {
                    const { packageGroups, standaloneReservations } = groupReservations(dayReservations);
                    const elements: JSX.Element[] = [];
                    
                    packageGroups.forEach((groupRes, groupKey) => {
                      const firstRes = groupRes[0];
                      elements.push(
                        <div key={`pkg-${groupKey}`} className="rounded-md border-2 border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 p-1.5">
                          <div className="flex items-center gap-1 mb-1 px-1">
                            <Package className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-medium text-purple-700 dark:text-purple-300 truncate">
                              {getPackageTourName(firstRes.packageTourId)}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground px-1 mb-1 truncate">
                            {firstRes.customerName}
                          </div>
                          <div className="space-y-1">
                            {groupRes.map(res => (
                              <ReservationCard 
                                key={res.id} 
                                reservation={res} 
                                activityName={getActivityName(res.activityId)}
                                activityColor={getActivityColor(res.activityId)}
                                onStatusChange={(status) => statusMutation.mutate({ id: res.id, status })}
                                onSelect={onReservationSelect}
                                draggable
                                onDragStart={handleDragStart}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    });
                    
                    standaloneReservations.forEach(res => {
                      elements.push(
                        <ReservationCard 
                          key={res.id} 
                          reservation={res} 
                          activityName={getActivityName(res.activityId)}
                          activityColor={getActivityColor(res.activityId)}
                          onStatusChange={(status) => statusMutation.mutate({ id: res.id, status })}
                          onSelect={onReservationSelect}
                          draggable
                          onDragStart={handleDragStart}
                        />
                      );
                    });
                    
                    return elements;
                  })()}
                </div>
                {dayReservations.length === 0 && (
                  <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    <div className="invisible group-hover:visible flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="text-xs">Rezervasyon Ekle</span>
                    </div>
                  </div>
                )}
                {dayReservations.length > 0 && (
                  <div className="invisible group-hover:visible absolute bottom-8 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border">
                      <Plus className="h-3 w-3" />
                      <span>Ekle</span>
                    </div>
                  </div>
                )}
                {capacityPct > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-muted/30">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`h-full transition-all cursor-help ${capacityPct >= 80 ? 'bg-red-500' : capacityPct >= 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(capacityPct, 100)}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        Doluluk: %{capacityPct}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
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
                      const isDropTarget = dragOverDate === dateStr && dragOverTime === timeSlot;

                      return (
                        <div 
                          key={timeSlot} 
                          className={`group/slot flex border-b cursor-pointer transition-colors ${isDropTarget ? 'bg-primary/20 ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'}`}
                          onClick={() => onDateClick(dateStr)}
                          onDragOver={(e) => handleDragOver(e, dateStr, timeSlot)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dateStr, timeSlot)}
                          data-testid={`timeslot-${dateStr}-${timeSlot}`}
                        >
                          <div className="w-16 py-3 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeSlot}
                          </div>
                          <div className="flex-1 py-1 min-h-[50px] flex flex-wrap gap-2 items-center">
                            {slotReservations.length === 0 && (
                              <div className={`flex items-center gap-1 text-muted-foreground ${isDropTarget ? 'visible' : 'invisible group-hover/slot:visible'}`}>
                                <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center">
                                  <Plus className="h-3 w-3" />
                                </div>
                                <span className="text-xs">{isDropTarget ? 'Buraya Bırak' : 'Rezervasyon Ekle'}</span>
                              </div>
                            )}
                            {(() => {
                              const { packageGroups, standaloneReservations } = groupReservations(slotReservations);
                              const elements: JSX.Element[] = [];
                              
                              packageGroups.forEach((groupRes, groupKey) => {
                                const firstRes = groupRes[0];
                                elements.push(
                                  <div 
                                    key={`pkg-${groupKey}`} 
                                    className="rounded-md border-2 border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 p-2 cursor-grab active:cursor-grabbing"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, firstRes)}
                                    onDragEnd={handleDragEnd}
                                  >
                                    <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
                                      <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                      <span className="font-medium text-purple-700 dark:text-purple-300">
                                        {getPackageTourName(firstRes.packageTourId)}
                                      </span>
                                      <span className="text-sm text-muted-foreground">-</span>
                                      <span className="text-sm font-medium">{firstRes.customerName}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {groupRes.map(res => (
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
                              });
                              
                              standaloneReservations.forEach(res => {
                                elements.push(
                                  <ReservationCard 
                                    key={res.id} 
                                    reservation={res} 
                                    activityName={getActivityName(res.activityId)}
                                    activityColor={getActivityColor(res.activityId)}
                                    onStatusChange={(status) => statusMutation.mutate({ id: res.id, status })}
                                    onSelect={onReservationSelect}
                                    expanded
                                    draggable
                                    onDragStart={handleDragStart}
                                  />
                                );
                              });
                              
                              return elements;
                            })()}
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

      <Dialog open={!!overflowDialogDate} onOpenChange={(open) => !open && setOverflowDialogDate(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {overflowDialogDate && format(new Date(overflowDialogDate), 'd MMMM yyyy, EEEE', { locale: tr })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {overflowDialogDate && (() => {
              const dayReservations = getReservationsForDate(overflowDialogDate);
              const { packageGroups, standaloneReservations } = groupReservations(dayReservations);
              
              type DisplayEntry = { type: 'package'; key: string; reservations: Reservation[]; time: string } | { type: 'standalone'; reservation: Reservation; time: string };
              const entries: DisplayEntry[] = [];
              
              packageGroups.forEach((groupRes, groupKey) => {
                const earliestTime = groupRes.reduce((min, r) => r.time < min ? r.time : min, groupRes[0].time);
                entries.push({ type: 'package', key: groupKey, reservations: groupRes, time: earliestTime });
              });
              
              standaloneReservations.forEach(res => {
                entries.push({ type: 'standalone', reservation: res, time: res.time });
              });
              
              entries.sort((a, b) => a.time.localeCompare(b.time));
              
              if (entries.length === 0) {
                return (
                  <div className="text-center text-muted-foreground py-4">
                    Bu tarihte rezervasyon yok
                  </div>
                );
              }
              
              return entries.map((entry) => {
                if (entry.type === 'package') {
                  const firstRes = entry.reservations[0];
                  return (
                    <div key={`pkg-${entry.key}`} className="rounded-md border-2 border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 p-3">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-medium text-purple-700 dark:text-purple-300">
                          {getPackageTourName(firstRes.packageTourId)}
                        </span>
                        <span className="text-sm text-muted-foreground">-</span>
                        <span className="text-sm font-medium">{firstRes.customerName}</span>
                        <Badge variant="secondary" className="text-xs">{entry.reservations.length} aktivite</Badge>
                      </div>
                      <div className="space-y-2">
                        {entry.reservations.sort((a, b) => a.time.localeCompare(b.time)).map(res => (
                          <div 
                            key={res.id}
                            className={`p-2 rounded border cursor-pointer hover:opacity-80 ${getActivityColor(res.activityId)} ${
                              res.status === 'cancelled' ? 'opacity-50 line-through' : ''
                            }`}
                            onClick={() => {
                              setOverflowDialogDate(null);
                              onReservationSelect(res);
                            }}
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-medium text-sm">{getActivityName(res.activityId)}</span>
                              <Badge variant="outline" className="text-xs">{res.time}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {res.quantity} kişi
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  const res = entry.reservation;
                  return (
                    <div 
                      key={res.id}
                      className={`p-3 rounded border cursor-pointer hover:opacity-80 ${getActivityColor(res.activityId)} ${
                        res.status === 'cancelled' ? 'opacity-50 line-through' : ''
                      }`}
                      onClick={() => {
                        setOverflowDialogDate(null);
                        onReservationSelect(res);
                      }}
                    >
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <span className="font-medium">{res.customerName}</span>
                        <Badge variant="outline">{res.time}</Badge>
                      </div>
                      <div className="text-sm mt-1">{getActivityName(res.activityId)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {res.quantity} kişi
                      </div>
                    </div>
                  );
                }
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Confirmation Dialog */}
      <Dialog open={!!pendingMove} onOpenChange={(open) => !open && cancelMove()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingMove?.isPackage ? "Paket Tur Taşıma Onayı" : "Rezervasyon Taşıma Onayı"}
            </DialogTitle>
          </DialogHeader>
          {pendingMove && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {pendingMove.isPackage 
                  ? `Bu paket turdaki tüm ${pendingMove.packageCount} rezervasyon aynı gün farkıyla taşınacak.`
                  : pendingMove.newTime && pendingMove.newTime !== pendingMove.reservation.time
                    ? (pendingMove.newDate !== pendingMove.reservation.date 
                        ? "Bu rezervasyonun tarih ve saatini değiştirmek istediğinizden emin misiniz?"
                        : "Bu rezervasyonun saatini değiştirmek istediğinizden emin misiniz?")
                    : "Bu rezervasyonu taşımak istediğinizden emin misiniz?"
                }
              </p>
              <Card className={`p-3 ${pendingMove.isPackage ? 'border-purple-300 dark:border-purple-700' : ''}`}>
                <div className="space-y-2">
                  {pendingMove.isPackage && (
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Paket Tur</span>
                      <Badge variant="secondary" className="text-xs">{pendingMove.packageCount} aktivite</Badge>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Müşteri:</span>
                    <span className="text-sm font-medium">{pendingMove.reservation.customerName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Aktivite:</span>
                    <span className="text-sm font-medium">{getActivityName(pendingMove.reservation.activityId)}</span>
                  </div>
                  <Separator />
                  {pendingMove.newDate !== pendingMove.reservation.date && (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Eski Tarih:</span>
                        <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          {format(new Date(pendingMove.reservation.date), "d MMMM yyyy", { locale: tr })}
                        </Badge>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Yeni Tarih:</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          {format(new Date(pendingMove.newDate), "d MMMM yyyy", { locale: tr })}
                        </Badge>
                      </div>
                    </>
                  )}
                  {pendingMove.newTime && pendingMove.newTime !== pendingMove.reservation.time && (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Eski Saat:</span>
                        <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {pendingMove.reservation.time}
                        </Badge>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Yeni Saat:</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {pendingMove.newTime}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </Card>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelMove}>
                  İptal
                </Button>
                <Button onClick={confirmMove} disabled={moveMutation.isPending || packageShiftMutation.isPending}>
                  {(moveMutation.isPending || packageShiftMutation.isPending) ? "Güncelleniyor..." : "Onayla"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Move Notification Dialog */}
      <Dialog open={!!showMoveNotification} onOpenChange={(open) => !open && setShowMoveNotification(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bilgilendirme Gönder</DialogTitle>
          </DialogHeader>
          {showMoveNotification && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {showMoveNotification.movedCount 
                  ? `${showMoveNotification.movedCount} rezervasyon başarıyla taşındı.`
                  : "Rezervasyon başarıyla taşındı."
                } Aşağıdaki kişilere bildirim göndermek ister misiniz?
              </p>
              
              {/* Customer Notification Section */}
              <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Müşteri Bildirimi</p>
                      <p className="text-xs text-muted-foreground">
                      {showMoveNotification.reservation.customerName} - {' '}
                      <span 
                        className="text-primary hover:underline cursor-pointer"
                        onClick={() => {
                          window.location.href = `/messages?phone=${encodeURIComponent(showMoveNotification.reservation.customerPhone)}`;
                        }}
                      >
                        {showMoveNotification.reservation.customerPhone}
                      </span>
                    </p>
                    </div>
                  </div>
                  <Textarea
                    value={moveCustomerMessage}
                    onChange={(e) => setMoveCustomerMessage(e.target.value)}
                    className="min-h-[120px] text-sm"
                    placeholder="Müşteriye gönderilecek mesaj..."
                    data-testid="textarea-move-customer-message"
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm"
                      disabled={customerNotificationMutation.isPending || !showMoveNotification.reservation.customerPhone || !moveCustomerMessage.trim()}
                      onClick={() => {
                        if (showMoveNotification.reservation.customerPhone) {
                          customerNotificationMutation.mutate({
                            phone: showMoveNotification.reservation.customerPhone,
                            message: moveCustomerMessage
                          });
                        }
                      }}
                      data-testid="button-send-move-customer-notification"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {customerNotificationMutation.isPending ? "Gönderiliyor..." : "Müşteriye Gönder"}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Agency Notification Section */}
              <Card className="p-4 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                      <Building className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Acenta Bildirimi</p>
                      <p className="text-xs text-muted-foreground">Acentayı seçin ve bildirim gönderin</p>
                    </div>
                  </div>
                  <Select value={moveSelectedAgencyId} onValueChange={setMoveSelectedAgencyId}>
                    <SelectTrigger data-testid="select-move-agency">
                      <SelectValue placeholder="Acenta seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies?.map((agency) => (
                        <SelectItem key={agency.id} value={String(agency.id)}>
                          {agency.name} {agency.contactInfo ? `(${agency.contactInfo})` : '(İletişim bilgisi yok)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={moveAgencyMessage}
                    onChange={(e) => setMoveAgencyMessage(e.target.value)}
                    className="min-h-[100px] text-sm"
                    placeholder="Acentaya gönderilecek mesaj..."
                    data-testid="textarea-move-agency-message"
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm"
                      disabled={agencyNotificationMutation.isPending || !moveSelectedAgencyId || !moveAgencyMessage.trim()}
                      onClick={() => {
                        if (moveSelectedAgencyId) {
                          agencyNotificationMutation.mutate({
                            agencyId: parseInt(moveSelectedAgencyId),
                            message: moveAgencyMessage
                          });
                        }
                      }}
                      data-testid="button-send-move-agency-notification"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {agencyNotificationMutation.isPending ? "Gönderiliyor..." : "Acentaya Gönder"}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowMoveNotification(null)}>
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  packageTourName?: string | null;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, reservation: Reservation) => void;
}

function ReservationCard({ reservation, activityName, activityColor, onStatusChange, onSelect, expanded, packageTourName, draggable, onDragStart }: ReservationCardProps) {
  const statusConfig = {
    confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700 border-green-200" },
    pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    cancelled: { label: "İptal", className: "bg-red-100 text-red-700 border-red-200" },
  };
  const status = statusConfig[reservation.status as keyof typeof statusConfig] || { label: reservation.status, className: "" };

  const handleDragStart = (e: React.DragEvent) => {
    if (draggable && onDragStart) {
      onDragStart(e, reservation);
    }
  };

  if (expanded) {
    return (
      <Card 
        className={`p-3 border ${activityColor} ${reservation.status === 'cancelled' ? 'opacity-50' : ''} cursor-pointer hover-elevate ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelect?.(reservation); }}
        data-testid={`card-reservation-${reservation.id}`}
        draggable={draggable}
        onDragStart={handleDragStart}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate flex items-center gap-1">
              {reservation.customerName}
              {reservation.hasTransfer && <Bus className="h-3 w-3 text-blue-500 flex-shrink-0" />}
            </div>
            <div className="text-xs text-muted-foreground">{activityName}</div>
            {packageTourName && (
              <div className="flex items-center gap-1 mt-0.5">
                <Package className="h-3 w-3 text-purple-500" />
                <span className="text-xs text-purple-600 dark:text-purple-400 truncate">{packageTourName}</span>
              </div>
            )}
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
      className={`p-2 text-xs border ${activityColor} ${reservation.status === 'cancelled' ? 'opacity-50' : ''} cursor-pointer hover-elevate ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect?.(reservation); }}
      data-testid={`card-reservation-${reservation.id}`}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      <div className="font-medium truncate flex items-center gap-1">
        {reservation.customerName}
        {reservation.hasTransfer && <Bus className="h-3 w-3 text-blue-500 flex-shrink-0" />}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground truncate">{activityName}</span>
        {packageTourName && <Package className="h-3 w-3 text-purple-500 flex-shrink-0" />}
      </div>
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
  onMoveSuccess?: (reservation: Reservation, oldDate: string, newDate: string, oldTime?: string, newTime?: string) => void;
}

function ReservationDetailDialog({ reservation, activities, onClose, onMoveSuccess }: ReservationDetailDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  
  useEffect(() => {
    if (reservation) {
      setEditDate(reservation.date);
      setEditTime(reservation.time);
      setIsEditing(false);
    }
  }, [reservation]);
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, date, time, oldDate, oldTime, res }: { id: number; date: string; time: string; oldDate: string; oldTime: string; res: Reservation }) => {
      return apiRequest('PATCH', `/api/reservations/${id}`, { date, time });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: "Başarılı", description: "Tarih ve saat güncellendi." });
      setIsEditing(false);
      if (onMoveSuccess && (variables.date !== variables.oldDate || variables.time !== variables.oldTime)) {
        onMoveSuccess(variables.res, variables.oldDate, variables.date, variables.oldTime, variables.time);
        onClose();
      }
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" });
    },
  });
  
  if (!reservation) return null;
  
  const activity = activities.find(a => a.id === reservation.activityId);
  const statusConfig = {
    confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700" },
    pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700" },
    cancelled: { label: "İptal", className: "bg-red-100 text-red-700" },
  };
  const status = statusConfig[reservation.status as keyof typeof statusConfig] || { label: reservation.status, className: "" };

  const availableTimes = activity ? (() => {
    try {
      return JSON.parse((activity as any).defaultTimes || "[]");
    } catch {
      return [];
    }
  })() : [];

  const copyTrackingLink = () => {
    if (reservation.trackingToken) {
      const link = `${window.location.origin}/takip/${reservation.trackingToken}`;
      navigator.clipboard.writeText(link);
      toast({ title: "Kopyalandı", description: "Takip linki panoya kopyalandı." });
    }
  };

  const handleSave = () => {
    if (!editDate || !editTime) {
      toast({ title: "Hata", description: "Tarih ve saat seçiniz.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ 
      id: reservation.id, 
      date: editDate, 
      time: editTime,
      oldDate: reservation.date,
      oldTime: reservation.time,
      res: reservation
    });
  };

  const handleCancel = () => {
    setEditDate(reservation.date);
    setEditTime(reservation.time);
    setIsEditing(false);
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(open) => { if (!open) { handleCancel(); onClose(); } }}>
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
              <div 
                className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1" 
                data-testid="text-customer-phone"
                onClick={() => {
                  window.location.href = `/messages?phone=${encodeURIComponent(reservation.customerPhone)}`;
                }}
              >
                <MessageCircle className="h-3 w-3" />
                {reservation.customerPhone}
              </div>
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
                <div className="font-medium">
                  {reservation.source === 'manual' ? 'Manuel' : 
                   reservation.source === 'woocommerce' ? 'WooCommerce' : 
                   reservation.source === 'partner' ? (() => {
                     const partnerMatch = (reservation as any).notes?.match(/\[Partner:\s*([^\]]+)\]/);
                     return partnerMatch ? `Partner: ${partnerMatch[1]}` : 'Partner Acenta';
                   })() : 
                   reservation.source}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Odeme Durumu</Label>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      (reservation as any).paymentStatus === 'paid' ? 'default' : 
                      (reservation as any).paymentStatus === 'partial' ? 'secondary' : 
                      'outline'
                    }
                    className={
                      (reservation as any).paymentStatus === 'paid' ? 'bg-green-600 text-white' : 
                      (reservation as any).paymentStatus === 'partial' ? 'bg-yellow-500 text-white' : 
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }
                    data-testid="badge-payment-status"
                  >
                    {(reservation as any).paymentStatus === 'paid' ? 'Odendi' : 
                     (reservation as any).paymentStatus === 'partial' ? 'Kismi' : 
                     'Odenmedi'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  Tarih
                  {!isEditing && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-datetime"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </Label>
                {isEditing ? (
                  <Input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)}
                    className="h-8 text-sm"
                    data-testid="input-edit-date"
                  />
                ) : (
                  <div className="font-medium" data-testid="text-date">{reservation.date}</div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Saat</Label>
                {isEditing ? (
                  availableTimes.length > 0 ? (
                    <Select value={editTime} onValueChange={setEditTime}>
                      <SelectTrigger className="h-8 text-sm" data-testid="select-edit-time">
                        <SelectValue placeholder="Saat seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimes.map((t: string) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      type="time" 
                      value={editTime} 
                      onChange={(e) => setEditTime(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-edit-time"
                    />
                  )
                ) : (
                  <div className="font-medium" data-testid="text-time">{reservation.time}</div>
                )}
              </div>
            </div>
            
            {isEditing && (
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-datetime"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Kaydet
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  Vazgeç
                </Button>
              </div>
            )}
          </div>

          {((reservation.priceTl ?? 0) > 0 || (reservation.priceUsd ?? 0) > 0) && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                {(reservation.priceTl ?? 0) > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Fiyat (TL)</Label>
                    <div className="font-medium">{(reservation.priceTl ?? 0).toLocaleString('tr-TR')} ₺</div>
                  </div>
                )}
                {(reservation.priceUsd ?? 0) > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Fiyat (USD)</Label>
                    <div className="font-medium">${reservation.priceUsd ?? 0}</div>
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
          <Button variant="outline" onClick={() => { handleCancel(); onClose(); }} data-testid="button-close-detail">
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
      const licenseErr = parseLicenseError(err);
      if (licenseErr.isLicenseError) {
        setLicenseErrorOpen(true);
        setLicenseErrorMessage(licenseErr.message);
        setLicenseErrorType(licenseErr.limitType);
      } else {
        const { title, description } = getErrorToastMessage(err);
        toast({ title, description, variant: "destructive" });
      }
    }
  };

  // License error dialog state
  const [licenseErrorOpen, setLicenseErrorOpen] = useState(false);
  const [licenseErrorMessage, setLicenseErrorMessage] = useState("");
  const [licenseErrorType, setLicenseErrorType] = useState<'activity' | 'reservation' | 'user' | 'general'>('general');

  return (
    <>
    <LicenseLimitDialog
      open={licenseErrorOpen}
      onOpenChange={setLicenseErrorOpen}
      errorMessage={licenseErrorMessage}
      limitType={licenseErrorType}
    />
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
    </>
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
