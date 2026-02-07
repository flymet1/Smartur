import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Clock, Users, Building2, ChevronLeft, ChevronRight, RefreshCw, Plus, Check, X, Loader2, Calendar, Send, TrendingUp, Activity as ActivityIcon, CalendarCheck, Download, FileText, CreditCard, Wallet, Trash2, AlertCircle, ArrowUpRight, ArrowDownLeft, Search } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Activity } from "@shared/schema";

interface PartnerActivity {
  id: number;
  name: string;
  description: string | null;
  price: number;
  priceUsd: number;
  durationMinutes: number;
  color: string;
  defaultTimes: string;
  partnerUnitPrice: number | null;
  partnerCurrency: string;
  capacities: {
    date: string;
    time: string;
    totalSlots: number;
    bookedSlots: number;
    availableSlots: number;
  }[];
}

interface PartnerData {
  partnerTenantId: number;
  partnerTenantName: string;
  activities: PartnerActivity[];
}

interface RequestDialogData {
  activityId: number;
  activityName: string;
  partnerTenantId: number;
  partnerTenantName: string;
  date: string;
  time: string;
  availableSlots: number;
  partnerUnitPrice: number | null;
  partnerCurrency: string;
}

interface ReservationRequest {
  id: number;
  tenantId: number | null;
  activityId: number;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  guests: number | null;
  notes: string | null;
  status: string | null;
  requestedBy: number | null;
  processedBy: number | null;
  processedAt: string | null;
  processNotes: string | null;
  reservationId: number | null;
  createdAt: string | null;
  requesterName?: string;
  requesterType?: 'viewer' | 'partner' | 'unknown';
}

interface OutgoingRequest extends ReservationRequest {
  activityName?: string;
  ownerTenantName?: string;
}

interface PartnerTransaction {
  id: number;
  reservationId: number | null;
  senderTenantId: number;
  receiverTenantId: number;
  activityId: number;
  guestCount: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  status: string;
  notes: string | null;
  createdAt: string;
  deletionRequestedAt: string | null;
  deletionRequestedByTenantId: number | null;
  deletionStatus: string | null;
  deletionRejectionReason: string | null;
  senderTenantName: string;
  receiverTenantName: string;
  activityName: string;
  currentTenantId: number;
}

interface ActiveReservation {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  date: string;
  time: string;
  quantity: number;
  status: string;
  activityId: number | null;
  activityName: string;
  orderNumber: string | null;
  hotelName: string | null;
  notes: string | null;
  source: string | null;
}

export default function PartnerAvailability() {
  const today = new Date();
  const [startDate, setStartDate] = useState(() => {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return monday.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday.toISOString().split('T')[0];
  });
  const [datePreset, setDatePreset] = useState<string>('this-week');
  const [activeTab, setActiveTab] = useState<string>('availability');
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('all');
  
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<RequestDialogData | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState("");
  const [paymentCollectionType, setPaymentCollectionType] = useState<string>("receiver_full");
  const [amountCollectedBySender, setAmountCollectedBySender] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState("");
  
  const [reservationSearch, setReservationSearch] = useState("");
  const [selectedReservation, setSelectedReservation] = useState<ActiveReservation | null>(null);
  const [showReservationResults, setShowReservationResults] = useState(false);
  
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReservationRequest | null>(null);
  const [processAction, setProcessAction] = useState<"approve" | "reject" | null>(null);
  const [processNotes, setProcessNotes] = useState("");
  const [notifyingSenderId, setNotifyingSenderId] = useState<number | null>(null);
  
  const [deletionRejectDialogOpen, setDeletionRejectDialogOpen] = useState(false);
  const [deletionRejectReason, setDeletionRejectReason] = useState("");
  const [selectedTransactionForDeletion, setSelectedTransactionForDeletion] = useState<number | null>(null);
  
  const { toast } = useToast();

  const { data: partnerData, isLoading, refetch, isFetching } = useQuery<PartnerData[]>({
    queryKey: [`/api/partner-shared-availability?startDate=${startDate}&endDate=${endDate}`],
  });
  
  const { data: allRequests = [], isLoading: requestsLoading } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
  });
  
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });
  
  // Giden talepler (benim gönderdiğim)
  const { data: outgoingRequests = [], isLoading: outgoingLoading } = useQuery<OutgoingRequest[]>({
    queryKey: ['/api/my-reservation-requests'],
    refetchInterval: 30000,
  });
  
  const pendingOutgoingRequests = outgoingRequests.filter(r => r.status === 'pending');
  const approvedOutgoingRequests = outgoingRequests.filter(r => r.status === 'approved' || r.status === 'converted');
  const cancelledOutgoingRequests = outgoingRequests.filter(r => r.status === 'cancelled' || r.status === 'rejected' || r.status === 'deleted');
  
  // Partner işlemleri (financial transactions)
  const { data: partnerTransactions = [], isLoading: transactionsLoading } = useQuery<PartnerTransaction[]>({
    queryKey: ['/api/partner-transactions'],
    refetchInterval: 30000,
  });
  
  // Active transactions (not cancelled or deleted)
  const activePartnerTransactions = partnerTransactions.filter(tx => 
    tx.status !== 'cancelled' && tx.deletionStatus !== 'approved'
  );
  
  // Cancelled or deleted transactions
  const cancelledOrDeletedTransactions = partnerTransactions.filter(tx => 
    tx.status === 'cancelled' || tx.deletionStatus === 'approved'
  );
  
  const partnerRequests = allRequests.filter(r => r.notes?.startsWith('[Partner:'));
  const pendingPartnerRequests = partnerRequests.filter(r => r.status === 'pending');
  const convertedPartnerRequests = partnerRequests.filter(r => r.status === 'converted');
  const cancelledPartnerRequests = partnerRequests.filter(r => r.status === 'cancelled' || r.status === 'rejected' || r.status === 'deleted');
  
  // Filter partner data based on selected partner
  const filteredPartnerData = (partnerData || []).filter(partner => 
    selectedPartnerFilter === 'all' || partner.partnerTenantId.toString() === selectedPartnerFilter
  );
  
  
  const processMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest('PATCH', `/api/reservation-requests/${id}`, { status, processNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-requests'] });
      toast({ title: "Basarili", description: "Talep durumu guncellendi." });
      setProcessDialogOpen(false);
      setSelectedRequest(null);
      setProcessNotes("");
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep guncellenemedi.", variant: "destructive" });
    },
  });


  const notifyPartnerMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      return apiRequest('POST', '/api/send-whatsapp-custom-message', { phone, message });
    },
    onSuccess: () => {
      toast({ title: "Basarili", description: "Partner acenta bilgilendirildi." });
      setNotifyingSenderId(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Mesaj gonderilemedi.", variant: "destructive" });
      setNotifyingSenderId(null);
    },
  });

  const notifyPartner = (request: ReservationRequest, statusText: string) => {
    const partnerName = getPartnerNameFromNotes(request.notes);
    const activityName = getActivityName(request.activityId);
    const dateFormatted = format(new Date(request.date), "d MMMM yyyy", { locale: tr });
    
    const message = `Merhaba ${partnerName},\n\n${request.customerName} isimli musteri icin ${dateFormatted} tarihli ${activityName} aktivitesi rezervasyon talebi ${statusText}.\n\nMusteri: ${request.customerName}\nTelefon: ${request.customerPhone}\nTarih: ${dateFormatted}\nSaat: ${request.time}\nKisi: ${request.guests || 1}`;
    
    setNotifyingSenderId(request.id);
    notifyPartnerMutation.mutate({ phone: request.customerPhone, message });
  };
  
  const createRequestMutation = useMutation({
    mutationFn: async (data: { 
      activityId: number; date: string; time: string; customerName: string; customerPhone: string; guests: number; notes: string;
      paymentCollectionType: string; amountCollectedBySender: number; paymentCurrency: string; paymentNotes: string;
      sourceReservationId: number;
    }) => {
      const res = await apiRequest('POST', '/api/partner-reservation-requests', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Talep Gonderildi", description: "Rezervasyon talebiniz partner acentaya iletildi." });
      queryClient.invalidateQueries({ queryKey: ['/api/my-reservation-requests'] });
      resetForm();
      setRequestDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Talep gonderilemedi", variant: "destructive" });
    }
  });
  
  // Partner transaction deletion mutations
  const requestDeletionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return apiRequest('POST', `/api/partner-transactions/${transactionId}/request-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Basarili", description: "Silme talebi gonderildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Silme talebi gonderilemedi.", variant: "destructive" });
    }
  });

  const approveDeletionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return apiRequest('POST', `/api/partner-transactions/${transactionId}/approve-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Basarili", description: "Silme onaylandi, islem kaldirildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Silme onaylanamadi.", variant: "destructive" });
    }
  });

  const rejectDeletionMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: number; reason: string }) => {
      return apiRequest('POST', `/api/partner-transactions/${transactionId}/reject-deletion`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Basarili", description: "Silme talebi reddedildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Red islemi basarisiz.", variant: "destructive" });
    }
  });

  const deleteOutgoingRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('DELETE', `/api/my-reservation-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-reservation-requests'] });
      toast({ title: "Basarili", description: "Talep silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep silinemedi.", variant: "destructive" });
    }
  });

  const getActivityName = (activityId: number) => {
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };
  
  const getPartnerNameFromNotes = (notes: string | null) => {
    if (!notes) return "Partner Acenta";
    const match = notes.match(/^\[Partner:\s*([^\]]+)\]/);
    return match ? match[1] : "Partner Acenta";
  };
  
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Beklemede</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Onaylandi</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Reddedildi</Badge>;
      case "converted":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Rezervasyona Donusturuldu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openProcessDialog = (request: ReservationRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setProcessAction(action);
    setProcessNotes("");
    setProcessDialogOpen(true);
  };

  const handleProcess = () => {
    if (!selectedRequest || !processAction) return;
    
    processMutation.mutate({
      id: selectedRequest.id,
      status: processAction === "approve" ? "approved" : "rejected",
      notes: processNotes || undefined,
    });
  };
  
  const reservationSearchParam = reservationSearch.length >= 2 ? reservationSearch : '';
  const { data: activeReservations = [], isLoading: reservationsSearchLoading } = useQuery<ActiveReservation[]>({
    queryKey: [`/api/reservations/active-for-partner${reservationSearchParam ? `?q=${encodeURIComponent(reservationSearchParam)}` : ''}`],
    enabled: requestDialogOpen,
  });

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setGuests(1);
    setNotes("");
    setSelectedSlot(null);
    setPaymentCollectionType("receiver_full");
    setAmountCollectedBySender(0);
    setPaymentNotes("");
    setReservationSearch("");
    setSelectedReservation(null);
    setShowReservationResults(false);
  };

  const selectReservation = (reservation: ActiveReservation) => {
    setSelectedReservation(reservation);
    setCustomerName(reservation.customerName);
    setCustomerPhone(reservation.customerPhone);
    setGuests(reservation.quantity);
    setNotes(reservation.notes || "");
    setReservationSearch("");
    setShowReservationResults(false);
  };

  const clearSelectedReservation = () => {
    setSelectedReservation(null);
    setCustomerName("");
    setCustomerPhone("");
    setGuests(1);
    setNotes("");
    setReservationSearch("");
  };
  
  const openRequestDialog = (slot: RequestDialogData) => {
    setSelectedSlot(slot);
    setRequestDialogOpen(true);
  };
  
  const handleSubmitRequest = () => {
    if (!selectedSlot) return;
    if (!selectedReservation) {
      toast({ title: "Hata", description: "Lutfen mevcut bir rezervasyon secin", variant: "destructive" });
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast({ title: "Hata", description: "Musteri adi ve telefonu zorunludur", variant: "destructive" });
      return;
    }
    if (guests < 1 || guests > selectedSlot.availableSlots) {
      toast({ title: "Hata", description: `Kisi sayisi 1-${selectedSlot.availableSlots} arasinda olmalidir`, variant: "destructive" });
      return;
    }
    
    createRequestMutation.mutate({
      activityId: selectedSlot.activityId,
      date: selectedSlot.date,
      time: selectedSlot.time,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      guests,
      notes: notes.trim(),
      paymentCollectionType,
      amountCollectedBySender: paymentCollectionType === 'sender_partial' ? amountCollectedBySender : 0,
      paymentCurrency: selectedSlot.partnerCurrency || 'TRY',
      paymentNotes: paymentNotes.trim(),
      sourceReservationId: selectedReservation.id,
    });
  };

  const navigateDates = (days: number) => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + days);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + days);
    setStartDate(newStart.toISOString().split('T')[0]);
    setEndDate(newEnd.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  const getAvailabilityColor = (available: number, total: number) => {
    if (available === 0) return 'bg-red-500/20 text-red-700 dark:text-red-400';
    const ratio = available / total;
    if (ratio > 0.5) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (ratio > 0.2) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
  };

  const groupCapacitiesByDate = (capacities: PartnerActivity['capacities']) => {
    const grouped: Record<string, typeof capacities> = {};
    capacities.forEach(cap => {
      if (!grouped[cap.date]) grouped[cap.date] = [];
      grouped[cap.date].push(cap);
    });
    return grouped;
  };

  const exportToExcel = () => {
    const headers = ['Partner', 'Aktivite', 'Tarih', 'Saat', 'Toplam Kapasite', 'Dolu', 'Musait'];
    const rows: string[][] = [];
    
    filteredPartnerData.forEach(partner => {
      partner.activities.forEach(activity => {
        activity.capacities.forEach(cap => {
          rows.push([
            partner.partnerTenantName,
            activity.name,
            format(new Date(cap.date), 'd MMM yyyy', { locale: tr }),
            cap.time,
            cap.totalSlots.toString(),
            cap.bookedSlots.toString(),
            cap.availableSlots.toString()
          ]);
        });
      });
    });
    
    const csvContent = [headers, ...rows].map(r => r.join('\t')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `partner-musaitlikleri-${format(new Date(), 'yyyy-MM-dd')}.xls`;
    link.click();
    toast({ title: "Basarili", description: "Excel dosyasi indirildi." });
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Partner Musaitlikleri - ${format(new Date(startDate), 'd MMM', { locale: tr })} - ${format(new Date(endDate), 'd MMM yyyy', { locale: tr })}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            h2 { color: #666; margin-top: 20px; }
            h3 { color: #888; margin-top: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .available { color: green; }
            .full { color: red; }
            .date-range { color: #666; font-size: 14px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Partner Musaitlikleri Raporu</h1>
          <p class="date-range">${format(new Date(startDate), 'd MMMM yyyy', { locale: tr })} - ${format(new Date(endDate), 'd MMMM yyyy', { locale: tr })}</p>
          ${filteredPartnerData.map(partner => `
            <h2>${partner.partnerTenantName}</h2>
            ${partner.activities.map(activity => `
              <h3>${activity.name}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Saat</th>
                    <th>Toplam</th>
                    <th>Dolu</th>
                    <th>Musait</th>
                  </tr>
                </thead>
                <tbody>
                  ${activity.capacities.map(cap => `
                    <tr>
                      <td>${format(new Date(cap.date), 'd MMM yyyy', { locale: tr })}</td>
                      <td>${cap.time}</td>
                      <td>${cap.totalSlots}</td>
                      <td>${cap.bookedSlots}</td>
                      <td class="${cap.availableSlots > 0 ? 'available' : 'full'}">${cap.availableSlots}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `).join('')}
          `).join('')}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast({ title: "Basarili", description: "PDF olarak yazdirilmaya hazirlandi." });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 xl:ml-64 p-4 pt-16 xl:pt-20 xl:px-8 xl:pb-8 pb-24">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary" />
              Partner Musaitlikleri
            </h1>
            <p className="text-muted-foreground mt-1">Bagli oldugunuz partner acentalarin paylasilan aktivitelerinin musaitligi</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedPartnerFilter} onValueChange={setSelectedPartnerFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-partner-filter">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Partner Sec" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Partnerler</SelectItem>
                {(partnerData || []).map((partner) => (
                  <SelectItem key={partner.partnerTenantId} value={partner.partnerTenantId.toString()}>
                    {partner.partnerTenantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={datePreset}
              onValueChange={(value) => {
                setDatePreset(value);
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                
                if (value === 'today') {
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                } else if (value === 'this-week') {
                  const dayOfWeek = now.getDay();
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  setStartDate(monday.toISOString().split('T')[0]);
                  setEndDate(sunday.toISOString().split('T')[0]);
                } else if (value === 'next-week') {
                  const dayOfWeek = now.getDay();
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7);
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  setStartDate(monday.toISOString().split('T')[0]);
                  setEndDate(sunday.toISOString().split('T')[0]);
                } else if (value === 'this-month') {
                  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
                  setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
                } else if (value === 'next-month') {
                  const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                  const lastDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                  setStartDate(firstDayNextMonth.toISOString().split('T')[0]);
                  setEndDate(lastDayNextMonth.toISOString().split('T')[0]);
                } else if (value === 'next-7-days') {
                  const weekLater = new Date(now);
                  weekLater.setDate(now.getDate() + 7);
                  setStartDate(todayStr);
                  setEndDate(weekLater.toISOString().split('T')[0]);
                } else if (value === 'next-30-days') {
                  const monthLater = new Date(now);
                  monthLater.setDate(now.getDate() + 30);
                  setStartDate(todayStr);
                  setEndDate(monthLater.toISOString().split('T')[0]);
                }
              }}
            >
              <SelectTrigger className="w-[100px] sm:w-[150px] text-xs sm:text-sm" data-testid="select-date-preset-top">
                <SelectValue placeholder="Tarih" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bugun</SelectItem>
                <SelectItem value="this-week">Bu Hafta</SelectItem>
                <SelectItem value="next-week">Gelecek Hafta</SelectItem>
                <SelectItem value="next-7-days">Sonraki 7 Gun</SelectItem>
                <SelectItem value="this-month">Bu Ay</SelectItem>
                <SelectItem value="next-month">Gelecek Ay</SelectItem>
                <SelectItem value="next-30-days">Sonraki 30 Gun</SelectItem>
                <SelectItem value="custom">Ozel</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => { navigateDates(-7); setDatePreset('custom'); }}
                data-testid="button-prev-week-top"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs sm:text-sm text-muted-foreground min-w-[140px] sm:min-w-[180px] text-center">
                {format(new Date(startDate), "d MMM", { locale: tr })} - {format(new Date(endDate), "d MMM yyyy", { locale: tr })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => { navigateDates(7); setDatePreset('custom'); }}
                data-testid="button-next-week-top"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-top"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>

            <Button variant="outline" onClick={exportToExcel} data-testid="button-export-excel">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>

            <Button variant="outline" onClick={exportToPDF} data-testid="button-export-pdf">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Analiz Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover-elevate" 
            onClick={() => setActiveTab('requests')}
            data-testid="card-incoming-requests"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Gelen Talepler</p>
                  <p className="text-2xl font-bold mt-1" data-testid="text-total-requests">{partnerRequests.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Toplam talep</p>
                </div>
                <div className="p-3 rounded-full shrink-0 bg-muted">
                  <Send className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover-elevate" 
            onClick={() => setActiveTab('availability')}
            data-testid="card-shared-activities"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Paylaşılan Aktivite</p>
                  <p className="text-2xl font-bold mt-1" data-testid="text-activity-count">
                    {filteredPartnerData.reduce((sum, p) => sum + p.activities.length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Toplam aktivite</p>
                </div>
                <div className="p-3 rounded-full shrink-0 bg-muted">
                  <ActivityIcon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover-elevate" 
            onClick={() => setActiveTab('availability')}
            data-testid="card-available-slots"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Müsait Slot</p>
                  <p className="text-2xl font-bold mt-1 text-green-600" data-testid="text-available-slots">
                    {filteredPartnerData.reduce((sum, p) => 
                      sum + p.activities.reduce((actSum, act) => 
                        actSum + act.capacities.reduce((capSum, cap) => capSum + cap.availableSlots, 0), 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Seçili dönemde</p>
                </div>
                <div className="p-3 rounded-full shrink-0 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer hover-elevate ${pendingPartnerRequests.length > 0 ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-600' : ''}`}
            onClick={() => {
              const el = document.getElementById('pending-requests-section');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            data-testid="card-pending-requests"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm ${pendingPartnerRequests.length > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>Bekleyen Talep</p>
                  <p className={`text-2xl font-bold mt-1 ${pendingPartnerRequests.length > 0 ? 'text-orange-600' : ''}`} data-testid="text-pending-requests">
                    {pendingPartnerRequests.length}
                  </p>
                  <p className={`text-xs mt-1 ${pendingPartnerRequests.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>Onay bekliyor</p>
                </div>
                <div className={`p-3 rounded-full shrink-0 ${pendingPartnerRequests.length > 0 ? 'bg-orange-200 text-orange-700 dark:bg-orange-800/50 dark:text-orange-300' : 'bg-muted'}`}>
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover-elevate" 
            onClick={() => {
              const el = document.getElementById('partner-transactions-section');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            data-testid="card-partner-transactions"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Partner Islemlerim</p>
                  <p className="text-2xl font-bold mt-1" data-testid="text-transaction-count">
                    {partnerTransactions.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Toplam islem</p>
                </div>
                <div className="p-3 rounded-full shrink-0 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Müsaitlik Bölümü */}
        <div className="space-y-4">
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { navigateDates(-7); setDatePreset('custom'); }}
                    data-testid="button-prev-week"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <Select 
                    value={datePreset}
                    onValueChange={(value) => {
                      setDatePreset(value);
                      const now = new Date();
                      const todayStr = now.toISOString().split('T')[0];
                      
                      if (value === 'today') {
                        setStartDate(todayStr);
                        setEndDate(todayStr);
                      } else if (value === 'this-week') {
                        const dayOfWeek = now.getDay();
                        const monday = new Date(now);
                        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        setStartDate(monday.toISOString().split('T')[0]);
                        setEndDate(sunday.toISOString().split('T')[0]);
                      } else if (value === 'next-week') {
                        const dayOfWeek = now.getDay();
                        const monday = new Date(now);
                        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7);
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        setStartDate(monday.toISOString().split('T')[0]);
                        setEndDate(sunday.toISOString().split('T')[0]);
                      } else if (value === 'this-month') {
                        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
                        setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
                      } else if (value === 'next-month') {
                        const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        const lastDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                        setStartDate(firstDayNextMonth.toISOString().split('T')[0]);
                        setEndDate(lastDayNextMonth.toISOString().split('T')[0]);
                      } else if (value === 'next-7-days') {
                        const weekLater = new Date(now);
                        weekLater.setDate(now.getDate() + 7);
                        setStartDate(todayStr);
                        setEndDate(weekLater.toISOString().split('T')[0]);
                      } else if (value === 'next-30-days') {
                        const monthLater = new Date(now);
                        monthLater.setDate(now.getDate() + 30);
                        setStartDate(todayStr);
                        setEndDate(monthLater.toISOString().split('T')[0]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[100px] sm:w-[150px] text-xs sm:text-sm" data-testid="select-date-preset">
                      <SelectValue placeholder="Hızlı Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Bugun</SelectItem>
                      <SelectItem value="this-week">Bu Hafta</SelectItem>
                      <SelectItem value="next-week">Gelecek Hafta</SelectItem>
                      <SelectItem value="next-7-days">Sonraki 7 Gun</SelectItem>
                      <SelectItem value="this-month">Bu Ay</SelectItem>
                      <SelectItem value="next-month">Gelecek Ay</SelectItem>
                      <SelectItem value="next-30-days">Sonraki 30 Gun</SelectItem>
                      <SelectItem value="custom">Ozel</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                      className="w-28 sm:w-36 text-xs sm:text-sm"
                      data-testid="input-start-date"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                      className="w-28 sm:w-36 text-xs sm:text-sm"
                      data-testid="input-end-date"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { navigateDates(7); setDatePreset('custom'); }}
                    data-testid="button-next-week"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    data-testid="button-refresh"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    Yenile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : !partnerData || partnerData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Paylasilan Aktivite Yok</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Henuz bagli oldugunuz partner acentalar aktivitelerini sizinle paylasmamis 
                    veya henuz bir partner acentaya baglanmadiniz.
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <a href="/settings?tab=partners">Partnerleri Yonet</a>
                  </Button>
                </CardContent>
              </Card>
            ) : filteredPartnerData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Secili Partner Bulunamadi</h3>
                  <p className="text-muted-foreground">Filtreyi degistirerek diger partnerleri gorebilirsiniz.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredPartnerData.map((partner) => (
                  <Card key={partner.partnerTenantId} className="overflow-hidden">
                    <CardHeader className="bg-muted/50">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {partner.partnerTenantName}
                      </CardTitle>
                      <CardDescription>
                        {partner.activities.length} aktivite paylasiliyor
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {partner.activities.map((activity) => {
                          const grouped = groupCapacitiesByDate(activity.capacities);
                          const dates = Object.keys(grouped).sort();
                          
                          return (
                            <div key={activity.id} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h4 className="font-medium flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: activity.color === 'blue' ? '#3b82f6' : 
                                               activity.color === 'green' ? '#22c55e' :
                                               activity.color === 'purple' ? '#a855f7' :
                                               activity.color === 'orange' ? '#f97316' :
                                               activity.color === 'pink' ? '#ec4899' :
                                               activity.color === 'cyan' ? '#06b6d4' :
                                               activity.color === 'red' ? '#ef4444' :
                                               activity.color === 'yellow' ? '#eab308' : '#3b82f6' 
                                      }}
                                    />
                                    {activity.name}
                                  </h4>
                                  {activity.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {activity.partnerUnitPrice ? (
                                    <Badge variant="default" className="mb-1 bg-green-600">
                                      {activity.partnerCurrency === 'USD' ? '$' : activity.partnerCurrency === 'EUR' ? '\u20AC' : ''}
                                      {activity.partnerUnitPrice.toLocaleString('tr-TR')}
                                      {activity.partnerCurrency === 'TRY' ? ' TL' : ` ${activity.partnerCurrency}`}
                                      <span className="ml-1 text-xs opacity-75">(Partner)</span>
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="mb-1">
                                      {activity.price.toLocaleString('tr-TR')} TL
                                    </Badge>
                                  )}
                                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                    <Clock className="w-3 h-3" />
                                    {activity.durationMinutes} dk
                                  </p>
                                </div>
                              </div>

                              {dates.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">
                                  Bu tarih araliginda kapasite bilgisi yok
                                </p>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                  {dates.map(date => {
                                    const caps = grouped[date];
                                    const totalAvailable = caps.reduce((sum, c) => sum + c.availableSlots, 0);
                                    const totalSlots = caps.reduce((sum, c) => sum + c.totalSlots, 0);
                                    
                                    return (
                                      <div 
                                        key={date} 
                                        className="border rounded-md p-2 text-center"
                                        data-testid={`capacity-${date}`}
                                      >
                                        <p className="text-xs font-medium mb-1">{formatDate(date)}</p>
                                        <div className="space-y-1">
                                          {caps.map((cap, idx) => (
                                            <button 
                                              key={idx}
                                              onClick={() => cap.availableSlots > 0 && openRequestDialog({
                                                activityId: activity.id,
                                                activityName: activity.name,
                                                partnerTenantId: partner.partnerTenantId,
                                                partnerTenantName: partner.partnerTenantName,
                                                date: cap.date,
                                                time: cap.time,
                                                availableSlots: cap.availableSlots,
                                                partnerUnitPrice: activity.partnerUnitPrice,
                                                partnerCurrency: activity.partnerCurrency
                                              })}
                                              disabled={cap.availableSlots === 0}
                                              className={`w-full text-xs px-2 py-1 rounded transition-all ${getAvailabilityColor(cap.availableSlots, cap.totalSlots)} ${cap.availableSlots > 0 ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : 'cursor-not-allowed opacity-60'}`}
                                              data-testid={`slot-${cap.date}-${cap.time}`}
                                            >
                                              <span className="font-medium">{cap.time}</span>
                                              <div className="flex items-center justify-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {cap.availableSlots}/{cap.totalSlots}
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                        <div className={`mt-1 text-xs font-medium px-2 py-0.5 rounded ${getAvailabilityColor(totalAvailable, totalSlots)}`}>
                                          Toplam: {totalAvailable}
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>

        {/* Bekleyen Talepler Bölümü - Takvimin Altında */}
        {pendingPartnerRequests.length > 0 && (
          <Card id="pending-requests-section" className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Bekleyen Talepler ({pendingPartnerRequests.length})
              </CardTitle>
              <CardDescription>Partner acentalardan gelen onay bekleyen talepler</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingPartnerRequests.map(request => (
                <div key={request.id} className="border rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{request.customerName}</p>
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300">
                          Gelen: {request.requesterName || getPartnerNameFromNotes(request.notes)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                        <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })}</span>
                        <span>{request.time}</span>
                        <span>{request.guests} kisi</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openProcessDialog(request, "reject")} data-testid={`button-reject-${request.id}`}>
                        <X className="w-4 h-4 mr-1" />
                        Reddet
                      </Button>
                      <Button size="sm" onClick={() => openProcessDialog(request, "approve")} data-testid={`button-approve-${request.id}`}>
                        <Check className="w-4 h-4 mr-1" />
                        Onayla
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}


        {/* Onaylanan (Dönüştürülen) Gelen Talepler */}
        {convertedPartnerRequests.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Onaylanan Talepler ({convertedPartnerRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {convertedPartnerRequests.map(request => (
                <div key={request.id} className="border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{request.customerName}</p>
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300">
                          Gelen: {request.requesterName || getPartnerNameFromNotes(request.notes)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                        <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })}</span>
                        <span>{request.time}</span>
                        <span>{request.guests} kisi</span>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      Rezervasyon Oluşturuldu
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ========== GİDEN TALEPLER BÖLÜMÜ ========== */}
        {/* Bekleyen Giden Talepler */}
        {pendingOutgoingRequests.length > 0 && (
          <Card className="mt-6 border-2 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Giden Bekleyen Talepler ({pendingOutgoingRequests.length})
              </CardTitle>
              <CardDescription>Partner acentalara gönderdiğiniz onay bekleyen talepler</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingOutgoingRequests.map(request => (
                <div key={request.id} className="border rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{request.customerName}</p>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300">
                          Giden: {request.ownerTenantName || 'Partner'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">{request.activityName || getActivityName(request.activityId)}</Badge>
                        <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })}</span>
                        <span>{request.time}</span>
                        <span>{request.guests} kisi</span>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                      Onay Bekliyor
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Onaylanan Giden Talepler */}
        {approvedOutgoingRequests.length > 0 && (
          <Card className="mt-6 border-2 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Giden Onaylanan Talepler ({approvedOutgoingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvedOutgoingRequests.map(request => (
                <div key={request.id} className="border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{request.customerName}</p>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300">
                          Giden: {request.ownerTenantName || 'Partner'}
                        </Badge>
                        {request.status === 'approved' && (
                          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                            Onaylandi
                          </Badge>
                        )}
                        {request.status === 'converted' && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            Rezervasyona Donusturuldu
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">{request.activityName || getActivityName(request.activityId)}</Badge>
                        <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })}</span>
                        <span>{request.time}</span>
                        <span>{request.guests} kisi</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            data-testid={`button-delete-outgoing-request-${request.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Sil
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Talebi Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{request.customerName}" için olan talebi silmek istediginizden emin misiniz? Bu islem geri alinamaz.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Vazgec</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteOutgoingRequestMutation.mutate(request.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* İptal Edilen & Silinen İşlemler */}
        {(cancelledOrDeletedTransactions.length > 0 || cancelledOutgoingRequests.length > 0 || cancelledPartnerRequests.length > 0) && (
          <Card className="mt-6 border-2 border-red-200 dark:border-red-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                Iptal Edilen & Silinen Islemler ({cancelledOrDeletedTransactions.length + cancelledOutgoingRequests.length + cancelledPartnerRequests.length})
              </CardTitle>
              <CardDescription>Iptal edilen veya silinen talepler ve islemler</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Silinen Partner İşlemleri */}
              {cancelledOrDeletedTransactions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Silinen Partner Islemleri ({cancelledOrDeletedTransactions.length})
                  </h4>
                  {cancelledOrDeletedTransactions.map(tx => {
                    const isSender = tx.currentTenantId === tx.senderTenantId;
                    return (
                      <div key={tx.id} className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 opacity-75">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium line-through">{tx.customerName}</p>
                              <Badge className={isSender 
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300" 
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300"
                              }>
                                {isSender ? `Giden: ${tx.receiverTenantName}` : `Gelen: ${tx.senderTenantName}`}
                              </Badge>
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                {tx.deletionStatus === 'approved' ? 'Silindi' : 'Iptal Edildi'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline">{tx.activityName}</Badge>
                              <span>{format(new Date(tx.reservationDate), "d MMM yyyy", { locale: tr })}</span>
                              <span>{tx.reservationTime}</span>
                              <span>{tx.guestCount} kisi</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm line-through text-muted-foreground">
                                {tx.currency === 'USD' ? '$' : tx.currency === 'EUR' ? '€' : ''}
                                {tx.totalPrice.toLocaleString('tr-TR')}
                                {tx.currency === 'TRY' ? ' TL' : ` ${tx.currency}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* İptal Edilen Giden Talepler */}
              {cancelledOutgoingRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" />
                    Iptal/Reddedilen Giden Talepler ({cancelledOutgoingRequests.length})
                  </h4>
                  {cancelledOutgoingRequests.map(request => (
                    <div key={request.id} className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 opacity-75">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium line-through">{request.customerName}</p>
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300">
                              Giden: {request.ownerTenantName || 'Partner'}
                            </Badge>
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                              {request.status === 'cancelled' ? 'Iptal Edildi' : request.status === 'deleted' ? 'Silindi' : 'Reddedildi'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{request.activityName || getActivityName(request.activityId)}</Badge>
                            <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })}</span>
                            <span>{request.time}</span>
                            <span>{request.guests} kisi</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* İptal Edilen Gelen Partner Talepleri */}
              {cancelledPartnerRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4" />
                    Iptal/Reddedilen Gelen Talepler ({cancelledPartnerRequests.length})
                  </h4>
                  {cancelledPartnerRequests.map(request => (
                    <div key={request.id} className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 opacity-75">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium line-through">{request.customerName}</p>
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300">
                              Gelen: {getPartnerNameFromNotes(request.notes)}
                            </Badge>
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                              {request.status === 'cancelled' ? 'Iptal Edildi' : request.status === 'deleted' ? 'Silindi' : 'Reddedildi'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                            <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })}</span>
                            <span>{request.time}</span>
                            <span>{request.guests || 1} kisi</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        <Dialog open={requestDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setRequestDialogOpen(open); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Rezervasyon Talebi
              </DialogTitle>
              <DialogDescription>
                {selectedSlot && (
                  <span>
                    <strong>{selectedSlot.activityName}</strong> - {selectedSlot.partnerTenantName}<br />
                    {formatDate(selectedSlot.date)} saat {selectedSlot.time} ({selectedSlot.availableSlots} bos yer)
                    {selectedSlot.partnerUnitPrice && (
                      <>
                        <br />
                        <span className="text-green-600 font-medium">
                          Fiyat: {selectedSlot.partnerCurrency === 'USD' ? '$' : selectedSlot.partnerCurrency === 'EUR' ? '\u20AC' : ''}
                          {selectedSlot.partnerUnitPrice.toLocaleString('tr-TR')}
                          {selectedSlot.partnerCurrency === 'TRY' ? ' TL' : ` ${selectedSlot.partnerCurrency}`} / kisi
                        </span>
                      </>
                    )}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4 px-1 overflow-y-auto flex-1">
              {!selectedReservation ? (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Rezervasyon Sec *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Musteri gondermek icin once mevcut bir rezervasyon secmelisiniz. Isim, telefon veya rezervasyon numarasi ile arayabilirsiniz.
                  </p>
                  <div className="relative">
                    <Input
                      value={reservationSearch}
                      onChange={(e) => {
                        setReservationSearch(e.target.value);
                        setShowReservationResults(true);
                      }}
                      onFocus={() => setShowReservationResults(true)}
                      placeholder="Isim, telefon veya rez. no ile arayın..."
                      autoComplete="off"
                      data-testid="input-reservation-search"
                    />
                    {reservationsSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  
                  {showReservationResults && (
                    <div className="max-h-60 overflow-y-auto border rounded-md">
                      {activeReservations.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {reservationSearch.length >= 2 
                            ? "Sonuc bulunamadi. Farkli bir arama deneyin." 
                            : "Aktif rezervasyonlariniz yukleniyor..."}
                        </div>
                      ) : (
                        activeReservations.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => selectReservation(r)}
                            className="w-full text-left p-3 border-b last:border-b-0 hover-elevate transition-colors"
                            data-testid={`reservation-option-${r.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-medium text-sm">{r.customerName}</span>
                              <Badge variant="secondary" className="text-xs">
                                #{r.orderNumber || r.id}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>{r.customerPhone}</span>
                              <span>|</span>
                              <span>{r.activityName}</span>
                              <span>|</span>
                              <span>{format(new Date(r.date), 'd MMM', { locale: tr })} {r.time}</span>
                              <span>|</span>
                              <span>{r.quantity} kisi</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Secilen Rezervasyon
                    </Label>
                    <Button variant="ghost" size="sm" onClick={clearSelectedReservation} data-testid="button-clear-reservation">
                      <X className="w-4 h-4 mr-1" /> Degistir
                    </Button>
                  </div>
                  
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium">{selectedReservation.customerName}</span>
                        <Badge variant="secondary">#{selectedReservation.orderNumber || selectedReservation.id}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>Telefon: {selectedReservation.customerPhone}</div>
                        <div>Aktivite: {selectedReservation.activityName}</div>
                        <div>Tarih: {format(new Date(selectedReservation.date), 'd MMM yyyy', { locale: tr })}</div>
                        <div>Saat: {selectedReservation.time}</div>
                        <div>Kisi: {selectedReservation.quantity}</div>
                        {selectedReservation.hotelName && <div>Otel: {selectedReservation.hotelName}</div>}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guests">Kisi Sayisi *</Label>
                    <Input
                      id="guests"
                      type="number"
                      min={1}
                      max={selectedSlot?.availableSlots || 10}
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                      data-testid="input-guests"
                    />
                    {selectedSlot && (
                      <p className="text-xs text-muted-foreground">Maksimum: {selectedSlot.availableSlots} kisi</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ozel istekler, transfer bilgisi vb."
                      className="resize-none"
                      rows={3}
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              )}
              
              <Separator className="my-4" />
              
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Odeme Tahsilat Bilgisi
                </Label>
                <RadioGroup
                  value={paymentCollectionType}
                  onValueChange={setPaymentCollectionType}
                  className="space-y-2"
                  data-testid="radio-payment-type"
                >
                  <div className="flex items-center space-x-2 p-2 rounded-md border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="receiver_full" id="receiver_full" data-testid="radio-receiver-full" />
                    <Label htmlFor="receiver_full" className="flex-1 cursor-pointer">
                      <span className="font-medium">Tamamini Partner Alacak</span>
                      <p className="text-xs text-muted-foreground">Musteri odemeyi partner acentaya yapacak</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-md border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="sender_full" id="sender_full" data-testid="radio-sender-full" />
                    <Label htmlFor="sender_full" className="flex-1 cursor-pointer">
                      <span className="font-medium">Tamamini Biz Aldik</span>
                      <p className="text-xs text-muted-foreground">Musteri tum odemeyi bize yapti</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-md border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="sender_partial" id="sender_partial" data-testid="radio-sender-partial" />
                    <Label htmlFor="sender_partial" className="flex-1 cursor-pointer">
                      <span className="font-medium">Kismi Odeme Aldik</span>
                      <p className="text-xs text-muted-foreground">Musteriden bir miktar aldik, kalani partner alacak</p>
                    </Label>
                  </div>
                </RadioGroup>
                
                {paymentCollectionType === 'sender_partial' && (
                  <div className="space-y-2 pl-6 border-l-2 border-primary/30">
                    <Label htmlFor="amountCollected">Aldigimiz Tutar ({selectedSlot?.partnerCurrency || 'TRY'})</Label>
                    <Input
                      id="amountCollected"
                      type="number"
                      min={0}
                      value={amountCollectedBySender}
                      onChange={(e) => setAmountCollectedBySender(parseInt(e.target.value) || 0)}
                      placeholder="Ornegin: 500"
                      data-testid="input-amount-collected"
                    />
                    {selectedSlot?.partnerUnitPrice && guests > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Toplam: {(selectedSlot.partnerUnitPrice * guests).toLocaleString('tr-TR')} {selectedSlot.partnerCurrency}
                        {amountCollectedBySender > 0 && (
                          <> | Kalan: {((selectedSlot.partnerUnitPrice * guests) - amountCollectedBySender).toLocaleString('tr-TR')} {selectedSlot.partnerCurrency}</>
                        )}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Odeme Notu (Opsiyonel)</Label>
                  <Input
                    id="paymentNotes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ornegin: Nakit odendi, Havale yapildi vb."
                    data-testid="input-payment-notes"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2 flex-shrink-0 pt-4 border-t">
              <Button variant="outline" onClick={() => { resetForm(); setRequestDialogOpen(false); }} data-testid="button-cancel">
                Vazgec
              </Button>
              <Button 
                onClick={handleSubmitRequest} 
                disabled={createRequestMutation.isPending || !selectedReservation}
                data-testid="button-submit-request"
              >
                {createRequestMutation.isPending ? "Gonderiliyor..." : "Talep Gonder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {processAction === "approve" ? "Talebi Onayla" : "Talebi Reddet"}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && `${selectedRequest.customerName} - ${getActivityName(selectedRequest.activityId)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Not (Opsiyonel)</Label>
                <Textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  placeholder="Islem notu..."
                  className="resize-none"
                  rows={3}
                  data-testid="input-process-notes"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>Vazgec</Button>
              <Button 
                variant={processAction === "reject" ? "destructive" : "default"}
                onClick={handleProcess}
                disabled={processMutation.isPending}
                data-testid="button-confirm-process"
              >
                {processMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : processAction === "approve" ? "Onayla" : "Reddet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deletionRejectDialogOpen} onOpenChange={setDeletionRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Silme Talebini Reddet</DialogTitle>
              <DialogDescription>
                Bu islemi silme talebini reddetmek icin bir neden yazin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Red Nedeni</Label>
                <Textarea
                  value={deletionRejectReason}
                  onChange={(e) => setDeletionRejectReason(e.target.value)}
                  placeholder="Ornegin: Islem kayitlari tutulmali..."
                  className="resize-none"
                  rows={3}
                  data-testid="input-deletion-reject-reason"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeletionRejectDialogOpen(false)}>Vazgec</Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (selectedTransactionForDeletion) {
                    rejectDeletionMutation.mutate({ 
                      transactionId: selectedTransactionForDeletion, 
                      reason: deletionRejectReason.trim() || 'Reddedildi' 
                    });
                    setDeletionRejectDialogOpen(false);
                  }
                }}
                disabled={rejectDeletionMutation.isPending}
                data-testid="button-confirm-reject-deletion"
              >
                {rejectDeletionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reddet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
