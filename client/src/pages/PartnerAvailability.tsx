import { useState } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, Users, Building2, ChevronLeft, ChevronRight, RefreshCw, Plus, Check, X, Loader2, User, Phone, MessageSquare, Handshake, ArrowRight, Send } from "lucide-react";
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
}

interface AppUserWithPhone {
  id: number;
  username: string;
  name: string | null;
  phone: string | null;
}

export default function PartnerAvailability() {
  const today = new Date();
  const [startDate, setStartDate] = useState(today.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);
    return weekLater.toISOString().split('T')[0];
  });
  
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<RequestDialogData | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState("");
  
  const { toast } = useToast();

  const { data: partnerData, isLoading, refetch, isFetching } = useQuery<PartnerData[]>({
    queryKey: [`/api/partner-shared-availability?startDate=${startDate}&endDate=${endDate}`],
  });

  // Partner Reservation Requests
  const { data: reservationRequests = [], isLoading: requestsLoading } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  const { data: users = [] } = useQuery<AppUserWithPhone[]>({
    queryKey: ['/api/tenant-users'],
  });

  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReservationRequest | null>(null);
  const [processAction, setProcessAction] = useState<"approve" | "reject" | null>(null);
  const [processNotes, setProcessNotes] = useState("");
  const [notifyingSenderId, setNotifyingSenderId] = useState<number | null>(null);

  const notifyPartnerMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      return apiRequest('POST', '/api/send-whatsapp-custom-message', { phone, message });
    },
    onSuccess: () => {
      toast({ title: "Basarili", description: "Is ortagi bilgilendirildi." });
      setNotifyingSenderId(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Mesaj gonderilemedi.", variant: "destructive" });
      setNotifyingSenderId(null);
    },
  });

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

  const convertMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/reservation-requests/${id}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: "Basarili", description: "Talep rezervasyona donusturuldu." });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Donusturulemedi.", variant: "destructive" });
    },
  });

  const getActivityName = (activityId: number) => {
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };

  const getRequesterName = (requestedBy: number | null) => {
    if (!requestedBy) return "Bilinmiyor";
    const user = users.find(u => u.id === requestedBy);
    return user?.name || user?.username || "Bilinmiyor";
  };

  const getRequesterPhone = (requestedBy: number | null) => {
    if (!requestedBy) return null;
    const user = users.find(u => u.id === requestedBy);
    return user?.phone || null;
  };

  const notifyPartner = (request: ReservationRequest, statusText: string) => {
    if (!request.requestedBy) {
      toast({ title: "Hata", description: "Is ortagi bilgisi bulunamadi.", variant: "destructive" });
      return;
    }
    const partnerPhone = getRequesterPhone(request.requestedBy);
    if (!partnerPhone) {
      toast({ title: "Hata", description: "Is ortaginin telefon numarasi bulunamadi.", variant: "destructive" });
      return;
    }
    const activityName = getActivityName(request.activityId);
    const dateFormatted = format(new Date(request.date), "d MMMM yyyy", { locale: tr });
    const message = `Merhaba ${getRequesterName(request.requestedBy)},\n\n${request.customerName} isimli musteri icin ${dateFormatted} tarihli ${activityName} aktivitesi rezervasyon talebi ${statusText}.\n\nMusteri: ${request.customerName}\nTelefon: ${request.customerPhone}\nTarih: ${dateFormatted}\nSaat: ${request.time}\nKisi: ${request.guests || 1}`;
    
    setNotifyingSenderId(request.id);
    notifyPartnerMutation.mutate({ phone: partnerPhone, message });
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

  const pendingRequests = reservationRequests.filter(r => r.status === "pending");
  const approvedRequests = reservationRequests.filter(r => r.status === "approved");
  const otherRequests = reservationRequests.filter(r => r.status !== "pending" && r.status !== "approved");
  
  const createRequestMutation = useMutation({
    mutationFn: async (data: { activityId: number; date: string; time: string; customerName: string; customerPhone: string; guests: number; notes: string }) => {
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
  
  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setGuests(1);
    setNotes("");
    setSelectedSlot(null);
  };
  
  const openRequestDialog = (slot: RequestDialogData) => {
    setSelectedSlot(slot);
    setRequestDialogOpen(true);
  };
  
  const handleSubmitRequest = () => {
    if (!selectedSlot) return;
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
      notes: notes.trim()
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

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Partner Yonetimi
          </h1>
          <p className="text-muted-foreground mt-1">Partner musaitlikleri ve rezervasyon taleplerini yonetin</p>
        </div>

        <Tabs defaultValue={pendingRequests.length > 0 ? "requests" : "availability"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="availability" className="gap-2" data-testid="tab-availability">
              <Calendar className="w-4 h-4" />
              Musaitlikler
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative" data-testid="tab-requests">
              <Handshake className="w-4 h-4" />
              Talepler
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="availability" className="space-y-4">
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateDates(-7)}
                    data-testid="button-prev-week"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                      data-testid="input-start-date"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                      data-testid="input-end-date"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateDates(7)}
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
            ) : (
              <div className="space-y-6">
                {partnerData.map((partner) => (
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
                                  <Badge variant="secondary" className="mb-1">
                                    {activity.price.toLocaleString('tr-TR')} TL
                                  </Badge>
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
                                                availableSlots: cap.availableSlots
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
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            {requestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : reservationRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Henuz rezervasyon talebi bulunmuyor.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {pendingRequests.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Bekleyen Talepler ({pendingRequests.length})
                    </h2>
                    <div className="grid gap-4">
                      {pendingRequests.map((request) => (
                        <Card key={request.id} className="border-yellow-200 dark:border-yellow-800">
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.customerName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.customerPhone}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })} - {request.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.guests || 1} kisi</span>
                                  </div>
                                </div>
                                {request.notes && (
                                  <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                    <MessageSquare className="h-4 w-4 mt-0.5" />
                                    <span>{request.notes}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Handshake className="h-3.5 w-3.5" />
                                  <span>Is Ortagi: {getRequesterName(request.requestedBy)}</span>
                                  {request.createdAt && (
                                    <span className="ml-2">({format(new Date(request.createdAt), "d MMM yyyy HH:mm", { locale: tr })})</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => openProcessDialog(request, "reject")}
                                  data-testid={`button-reject-${request.id}`}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reddet
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => openProcessDialog(request, "approve")}
                                  data-testid={`button-approve-${request.id}`}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Onayla
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {approvedRequests.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      Onaylanan Talepler ({approvedRequests.length})
                    </h2>
                    <div className="grid gap-4">
                      {approvedRequests.map((request) => (
                        <Card key={request.id} className="border-green-200 dark:border-green-800">
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.customerName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.customerPhone}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })} - {request.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.guests || 1} kisi</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Handshake className="h-3.5 w-3.5" />
                                  <span>Is Ortagi: {getRequesterName(request.requestedBy)}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => notifyPartner(request, "ONAYLANDI")}
                                      disabled={notifyingSenderId === request.id}
                                      data-testid={`button-notify-approved-${request.id}`}
                                    >
                                      {notifyingSenderId === request.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Is ortagini bilgilendir</TooltipContent>
                                </Tooltip>
                                <Button
                                  size="sm"
                                  onClick={() => convertMutation.mutate(request.id)}
                                  disabled={convertMutation.isPending}
                                  data-testid={`button-convert-${request.id}`}
                                >
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Rezervasyona Donustur
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {otherRequests.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                      Diger Talepler ({otherRequests.length})
                    </h2>
                    <div className="grid gap-4">
                      {otherRequests.map((request) => (
                        <Card key={request.id} className="opacity-75">
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.customerName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.customerPhone}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })} - {request.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.guests || 1} kisi</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Handshake className="h-3.5 w-3.5" />
                                  <span>Is Ortagi: {getRequesterName(request.requestedBy)}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Process Dialog */}
        <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {processAction === "approve" ? "Talebi Onayla" : "Talebi Reddet"}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <span>
                    {selectedRequest.customerName} - {getActivityName(selectedRequest.activityId)}<br />
                    {format(new Date(selectedRequest.date), "d MMMM yyyy", { locale: tr })} saat {selectedRequest.time}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="processNotes">Not (Opsiyonel)</Label>
              <Textarea
                id="processNotes"
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                placeholder="Islem notu ekleyin..."
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
                Vazgec
              </Button>
              <Button
                onClick={handleProcess}
                disabled={processMutation.isPending}
                className={processAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {processMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {processAction === "approve" ? "Onayla" : "Reddet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={requestDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setRequestDialogOpen(open); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Rezervasyon Talebi
              </DialogTitle>
              <DialogDescription>
                {selectedSlot && (
                  <span>
                    <strong>{selectedSlot.activityName}</strong> - {selectedSlot.partnerTenantName}<br />
                    {formatDate(selectedSlot.date)} saat {selectedSlot.time} ({selectedSlot.availableSlots} bos yer)
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Musteri Adi *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ornegin: Ahmet Yilmaz"
                  data-testid="input-customer-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefon *</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ornegin: 5551234567"
                  data-testid="input-customer-phone"
                />
              </div>
              
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
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { resetForm(); setRequestDialogOpen(false); }} data-testid="button-cancel">
                Vazgec
              </Button>
              <Button 
                onClick={handleSubmitRequest} 
                disabled={createRequestMutation.isPending}
                data-testid="button-submit-request"
              >
                {createRequestMutation.isPending ? "Gonderiliyor..." : "Talep Gonder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
