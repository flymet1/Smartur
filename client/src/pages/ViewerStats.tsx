import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Users, 
  TrendingUp, 
  Download,
  BarChart3,
  Send,
  MessageSquare,
  Loader2,
  Filter,
  Clock,
  Check,
  X
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Activity } from "@shared/schema";

interface ViewerStat {
  viewerId: number;
  viewerName: string;
  viewerEmail: string;
  period: string;
  count: number;
}

interface PartnerUser {
  id: number;
  username: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface PartnerActivityStat {
  viewerId: number;
  viewerName: string;
  viewerPhone: string | null;
  activityId: number;
  activityName: string;
  totalGuests: number;
  totalRequests: number;
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

export default function ViewerStats() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [presetRange, setPresetRange] = useState<string>('last30');
  const [activeTab, setActiveTab] = useState<string>('requests');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");
  const [bulkMessage, setBulkMessage] = useState("");
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReservationRequest | null>(null);
  const [processAction, setProcessAction] = useState<"approve" | "reject" | null>(null);
  const [processNotes, setProcessNotes] = useState("");
  const [notifyingSenderId, setNotifyingSenderId] = useState<number | null>(null);

  const { data: partnerUsers = [] } = useQuery<PartnerUser[]>({
    queryKey: ['/api/tenant-users'],
  });
  
  const { data: allRequests = [], isLoading: requestsLoading } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
  });
  
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });
  
  const viewerRequests = allRequests.filter(r => !r.notes?.startsWith('[Partner:'));
  const pendingViewerRequests = viewerRequests.filter(r => r.status === 'pending');
  
  const processMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest('PATCH', `/api/reservation-requests/${id}`, { status, processNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-requests'] });
      toast({ title: "Başarılı", description: "Talep durumu güncellendi." });
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
      toast({ title: "Başarılı", description: "İzleyici bilgilendirildi." });
      setNotifyingSenderId(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Mesaj gönderilemedi.", variant: "destructive" });
      setNotifyingSenderId(null);
    },
  });
  
  const getActivityName = (activityId: number) => {
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };
  
  const getRequesterName = (requestedBy: number | null) => {
    const user = partnerUsers.find(u => u.id === requestedBy);
    return user?.name || user?.username || "Bilinmiyor";
  };
  
  const getRequesterPhone = (requestedBy: number | null) => {
    if (!requestedBy) return null;
    const user = partnerUsers.find(u => u.id === requestedBy);
    return user?.phone || null;
  };

  const notifyPartner = (request: ReservationRequest, statusText: string) => {
    if (!request.requestedBy) {
      toast({ title: "Hata", description: "İzleyici bilgisi bulunamadı.", variant: "destructive" });
      return;
    }
    const partnerPhone = getRequesterPhone(request.requestedBy);
    if (!partnerPhone) {
      toast({ title: "Hata", description: "İzleyicinin telefon numarası bulunamadı.", variant: "destructive" });
      return;
    }
    const activityName = getActivityName(request.activityId);
    const dateFormatted = format(new Date(request.date), "d MMMM yyyy", { locale: tr });
    const message = `Merhaba ${getRequesterName(request.requestedBy)},\n\n${request.customerName} isimli müşteri için ${dateFormatted} tarihli ${activityName} aktivitesi rezervasyon talebi ${statusText}.\n\nMüşteri: ${request.customerName}\nTelefon: ${request.customerPhone}\nTarih: ${dateFormatted}\nSaat: ${request.time}\nKişi: ${request.guests || 1}`;
    
    setNotifyingSenderId(request.id);
    notifyPartnerMutation.mutate({ phone: partnerPhone, message });
  };
  
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Beklemede</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Onaylandı</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Reddedildi</Badge>;
      case "converted":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Rezervasyona Dönüştürüldü</Badge>;
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

  const partnersWithPhone = useMemo(() => 
    partnerUsers.filter(u => u.phone && u.phone.trim() !== ''),
    [partnerUsers]
  );

  const sendBulkMessage = async () => {
    if (!bulkMessage.trim()) {
      toast({ title: "Hata", description: "Mesaj içeriği giriniz.", variant: "destructive" });
      return;
    }
    if (partnersWithPhone.length === 0) {
      toast({ title: "Hata", description: "Telefon numarası olan izleyici bulunamadı.", variant: "destructive" });
      return;
    }

    setIsSendingBulk(true);
    let successCount = 0;
    let failCount = 0;

    for (const partner of partnersWithPhone) {
      try {
        await apiRequest('POST', '/api/send-whatsapp-custom-message', {
          phone: partner.phone,
          message: bulkMessage.replace(/{isim}/gi, partner.name || partner.username)
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsSendingBulk(false);
    setBulkMessage("");
    
    if (successCount > 0) {
      toast({ 
        title: "Toplu mesaj gönderildi", 
        description: `${successCount} izleyiciye mesaj gönderildi${failCount > 0 ? `, ${failCount} başarısız` : ''}.` 
      });
    } else {
      toast({ title: "Hata", description: "Mesajlar gönderilemedi.", variant: "destructive" });
    }
  };

  const handlePresetChange = (preset: string) => {
    setPresetRange(preset);
    const now = new Date();
    
    switch (preset) {
      case 'last7':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'last30':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'last90':
        setDateRange({ from: subDays(now, 90), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
    }
  };

  const { data: activityStats = [], isLoading } = useQuery<PartnerActivityStat[]>({
    queryKey: ['/api/partner-activity-stats', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append('from', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append('to', dateRange.to.toISOString());
      }
      const res = await fetch(`/api/partner-activity-stats?${params}`, { credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const groupedStats = useMemo(() => {
    const grouped: Record<number, { 
      name: string; 
      phone: string | null; 
      activities: { activityId: number; activityName: string; guests: number; requests: number }[];
      totalGuests: number;
      totalRequests: number;
    }> = {};
    
    activityStats.forEach(stat => {
      if (!grouped[stat.viewerId]) {
        grouped[stat.viewerId] = {
          name: stat.viewerName,
          phone: stat.viewerPhone,
          activities: [],
          totalGuests: 0,
          totalRequests: 0
        };
      }
      grouped[stat.viewerId].activities.push({
        activityId: stat.activityId,
        activityName: stat.activityName,
        guests: stat.totalGuests,
        requests: stat.totalRequests
      });
      grouped[stat.viewerId].totalGuests += stat.totalGuests;
      grouped[stat.viewerId].totalRequests += stat.totalRequests;
    });
    
    return Object.entries(grouped).map(([id, data]) => ({
      viewerId: parseInt(id),
      ...data
    })).sort((a, b) => b.totalGuests - a.totalGuests);
  }, [activityStats]);

  const filteredStats = useMemo(() => {
    if (selectedPartnerId === 'all') return groupedStats;
    return groupedStats.filter(s => s.viewerId === parseInt(selectedPartnerId));
  }, [groupedStats, selectedPartnerId]);

  const totalGuests = useMemo(() => 
    filteredStats.reduce((sum, s) => sum + s.totalGuests, 0), 
    [filteredStats]
  );

  const totalRequests = useMemo(() => 
    filteredStats.reduce((sum, s) => sum + s.totalRequests, 0), 
    [filteredStats]
  );

  const exportToCSV = () => {
    const headers = ['İzleyici', 'Aktivite', 'Kişi Sayısı', 'Talep Sayısı'];
    const rows: string[][] = [];
    
    filteredStats.forEach(partner => {
      partner.activities.forEach(act => {
        rows.push([partner.name, act.activityName, act.guests.toString(), act.requests.toString()]);
      });
    });
    
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `izleyici-istatistikleri-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">İzleyiciler</h1>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
              <SelectTrigger className="w-[200px]" data-testid="select-partner-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="İzleyici Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm İzleyiciler</SelectItem>
                {groupedStats.map((partner) => (
                  <SelectItem key={partner.viewerId} value={partner.viewerId.toString()}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={presetRange} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[140px]" data-testid="select-preset-range">
                <SelectValue placeholder="Tarih Araligi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Son 7 gun</SelectItem>
                <SelectItem value="last30">Son 30 gun</SelectItem>
                <SelectItem value="last90">Son 90 gun</SelectItem>
                <SelectItem value="thisMonth">Bu ay</SelectItem>
                <SelectItem value="lastMonth">Gecen ay</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-date-picker">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range) {
                      setDateRange({ from: range.from, to: range.to });
                      setPresetRange('custom');
                    }
                  }}
                  locale={tr}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              CSV Indir
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card 
            className="cursor-pointer hover-elevate" 
            onClick={() => setActiveTab('requests')}
            data-testid="card-incoming-requests"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gelen Talepler</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-viewer-requests">{viewerRequests.length}</div>
              <p className="text-xs text-muted-foreground">Toplam talep</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover-elevate" 
            onClick={() => setActiveTab('stats')}
            data-testid="card-total-guests"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kisi</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-guests">{totalGuests}</div>
              <p className="text-xs text-muted-foreground">
                {dateRange.from && dateRange.to && 
                  `${format(dateRange.from, 'd MMM', { locale: tr })} - ${format(dateRange.to, 'd MMM yyyy', { locale: tr })}`
                }
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover-elevate" 
            onClick={() => setActiveTab('stats')}
            data-testid="card-active-partners"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif İzleyici</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-partners">{groupedStats.length}</div>
              <p className="text-xs text-muted-foreground">Talep gönderen izleyici</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer hover-elevate ${pendingViewerRequests.length > 0 ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-600' : ''}`}
            onClick={() => {
              setActiveTab('requests');
              setTimeout(() => {
                const el = document.getElementById('pending-viewer-requests-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            data-testid="card-pending-requests"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${pendingViewerRequests.length > 0 ? 'text-orange-700 dark:text-orange-300' : ''}`}>Bekleyen Talep</CardTitle>
              <Clock className={`h-4 w-4 ${pendingViewerRequests.length > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${pendingViewerRequests.length > 0 ? 'text-orange-600' : ''}`} data-testid="text-pending-requests">{pendingViewerRequests.length}</div>
              <p className={`text-xs ${pendingViewerRequests.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>Onay bekliyor</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          
          <TabsContent value="requests" className="space-y-4">
            {requestsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewerRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Henüz Talep Yok</h3>
                  <p className="text-muted-foreground">İzleyicilerden gelen rezervasyon talebi bulunmuyor.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {pendingViewerRequests.length > 0 && (
                  <Card id="pending-viewer-requests-section">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        Bekleyen Talepler ({pendingViewerRequests.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pendingViewerRequests.map(request => (
                        <div key={request.id} className="border rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-950/20">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="font-medium">{request.customerName}</p>
                              <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })}</span>
                                <span>{request.time}</span>
                                <span>{request.guests} kişi</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Talep eden: {getRequesterName(request.requestedBy)}</p>
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
                
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">İzleyici Performansı</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Bu tarih aralığında veri bulunamadı
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>İzleyici</TableHead>
                          <TableHead>Aktiviteler</TableHead>
                          <TableHead className="text-right">Kisi</TableHead>
                          <TableHead className="text-right">Talep</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStats.map((partner) => (
                          <TableRow key={partner.viewerId} data-testid={`row-partner-${partner.viewerId}`}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{partner.name}</div>
                                {partner.phone && (
                                  <div className="text-xs text-muted-foreground">{partner.phone}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {partner.activities.map((act) => (
                                  <Badge key={act.activityId} variant="outline" className="text-xs">
                                    {act.activityName} ({act.guests})
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{partner.totalGuests}</TableCell>
                            <TableCell className="text-right">{partner.totalRequests}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="message">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Toplu WhatsApp Bildirimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkMessage">Mesaj İçeriği</Label>
                  <Textarea
                    id="bulkMessage"
                    placeholder="Merhaba {isim}, size önemli bir duyuru yapmak istiyoruz..."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    rows={4}
                    data-testid="input-bulk-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kullanılabilir değişkenler: {"{isim}"} - İzleyicinin adı
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    {partnersWithPhone.length} izleyiciye mesaj gönderilecek
                  </p>
                  <Button 
                    onClick={sendBulkMessage} 
                    disabled={isSendingBulk || partnersWithPhone.length === 0}
                    data-testid="button-send-bulk"
                  >
                    {isSendingBulk ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isSendingBulk ? "Gönderiliyor..." : "Toplu Gönder"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
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
                  placeholder="İşlem notu..."
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
      </main>
    </div>
  );
}
