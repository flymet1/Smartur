import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  Check, 
  X, 
  Clock, 
  Loader2, 
  ArrowRight,
  User,
  Phone,
  Calendar,
  Users,
  MessageSquare,
  Handshake,
  Send,
  Eye
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Activity } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UserRole {
  id: number;
  userId: number;
  roleId: number;
}

interface AppUserWithRoles {
  id: number;
  username: string;
  name: string | null;
  phone: string | null;
  roles: UserRole[];
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
  requesterPhone?: string | null;
  requesterType?: 'viewer' | 'partner' | 'unknown';
  requestCategory?: 'new_reservation';
}

export default function ReservationRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReservationRequest | null>(null);
  const [processAction, setProcessAction] = useState<"approve" | "reject" | null>(null);
  const [processNotes, setProcessNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  const { data: users = [] } = useQuery<AppUserWithRoles[]>({
    queryKey: ['/api/tenant-users'],
  });

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

  const getRequestType = (request: ReservationRequest): 'viewer' | 'partner' => {
    // Use backend-provided requesterType if available
    if (request.requesterType === 'viewer') return 'viewer';
    if (request.requesterType === 'partner') return 'partner';
    
    // Fallback to notes parsing
    if (!request.notes) return 'partner';
    const lowerNotes = request.notes.toLowerCase();
    if (lowerNotes.includes('[viewer:') || lowerNotes.includes('[izleyici:')) {
      return 'viewer';
    }
    return 'partner';
  };
  
  const getRequesterDisplayName = (request: ReservationRequest): string => {
    // Use backend-provided requesterName if available
    if (request.requesterName && request.requesterName !== 'Bilinmiyor') {
      return request.requesterName;
    }
    // Fallback to local lookup
    return getRequesterName(request.requestedBy);
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

  const viewerRequests = requests.filter(r => getRequestType(r) === 'viewer');
  const partnerRequests = requests.filter(r => getRequestType(r) === 'partner');
  
  const pendingViewerRequests = viewerRequests.filter(r => r.status === "pending");
  const approvedViewerRequests = viewerRequests.filter(r => r.status === "approved");
  const otherViewerRequests = viewerRequests.filter(r => r.status !== "pending" && r.status !== "approved");
  
  const pendingPartnerRequests = partnerRequests.filter(r => r.status === "pending");
  const approvedPartnerRequests = partnerRequests.filter(r => r.status === "approved");
  const otherPartnerRequests = partnerRequests.filter(r => r.status !== "pending" && r.status !== "approved");

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Rezervasyon Talepleri</h1>
            <p className="text-muted-foreground text-sm">
              Is ortaklarindan gelen rezervasyon taleplerini yonetin.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henuz rezervasyon talebi bulunmuyor.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {partnerRequests.length > 0 && (
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Handshake className="h-5 w-5 text-purple-500" />
                      Is Ortagi Talepleri ({partnerRequests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingPartnerRequests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                          <Clock className="h-4 w-4" />
                          Bekleyen ({pendingPartnerRequests.length})
                        </h3>
                        <div className="grid gap-3">
                          {pendingPartnerRequests.map((request) => (
                            <div key={request.id} className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                    {getStatusBadge(request.status)}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-muted-foreground" />{request.customerName}</span>
                                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{request.customerPhone}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{format(new Date(request.date), "d MMM", { locale: tr })} {request.time}</span>
                                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground" />{request.guests || 1} kisi</span>
                                  </div>
                                  {request.notes && (
                                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                      <MessageSquare className="h-3.5 w-3.5 mt-0.5" />
                                      <span>{request.notes}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Handshake className="h-3.5 w-3.5" />
                                    <span>Is Ortagi: {getRequesterDisplayName(request)}</span>
                                    {request.createdAt && <span className="ml-1">({format(new Date(request.createdAt), "d MMM HH:mm", { locale: tr })})</span>}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => openProcessDialog(request, "reject")} data-testid={`button-reject-partner-${request.id}`}>
                                    <X className="h-4 w-4 mr-1" />Reddet
                                  </Button>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openProcessDialog(request, "approve")} data-testid={`button-approve-partner-${request.id}`}>
                                    <Check className="h-4 w-4 mr-1" />Onayla
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {approvedPartnerRequests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Onaylanan ({approvedPartnerRequests.length})
                        </h3>
                        <div className="grid gap-3">
                          {approvedPartnerRequests.map((request) => (
                            <div key={request.id} className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                    {getStatusBadge(request.status)}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-muted-foreground" />{request.customerName}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{format(new Date(request.date), "d MMM", { locale: tr })} {request.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Handshake className="h-3.5 w-3.5" />
                                    <span>Is Ortagi: {getRequesterDisplayName(request)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="outline" onClick={() => notifyPartner(request, "ONAYLANDI")} disabled={notifyingSenderId === request.id} data-testid={`button-notify-partner-${request.id}`}>
                                        {notifyingSenderId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Is ortagini WhatsApp ile bilgilendir</TooltipContent>
                                  </Tooltip>
                                  <Button size="sm" onClick={() => convertMutation.mutate(request.id)} disabled={convertMutation.isPending} data-testid={`button-convert-partner-${request.id}`}>
                                    {convertMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                                    Rezervasyona Donustur
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {otherPartnerRequests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Diger ({otherPartnerRequests.length})</h3>
                        <div className="grid gap-3">
                          {otherPartnerRequests.map((request) => (
                            <div key={request.id} className="bg-muted/50 border rounded-lg p-3 opacity-70">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                  {getStatusBadge(request.status)}
                                  <span>{request.customerName}</span>
                                  <span className="text-muted-foreground">{format(new Date(request.date), "d MMM", { locale: tr })}</span>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => notifyPartner(request, request.status === "rejected" ? "REDDEDILDI" : request.status === "converted" ? "REZERVASYONA DONUSTURULDU" : "GUNCELLENDI")} disabled={notifyingSenderId === request.id} data-testid={`button-notify-other-partner-${request.id}`}>
                                      {notifyingSenderId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Is ortagini WhatsApp ile bilgilendir</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {viewerRequests.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-500" />
                      Izleyici Talepleri ({viewerRequests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingViewerRequests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                          <Clock className="h-4 w-4" />
                          Bekleyen ({pendingViewerRequests.length})
                        </h3>
                        <div className="grid gap-3">
                          {pendingViewerRequests.map((request) => (
                            <div key={request.id} className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                    {getStatusBadge(request.status)}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-muted-foreground" />{request.customerName}</span>
                                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{request.customerPhone}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{format(new Date(request.date), "d MMM", { locale: tr })} {request.time}</span>
                                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground" />{request.guests || 1} kisi</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Izleyici: {getRequesterDisplayName(request)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => openProcessDialog(request, "reject")} data-testid={`button-reject-viewer-${request.id}`}>
                                    <X className="h-4 w-4 mr-1" />Reddet
                                  </Button>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openProcessDialog(request, "approve")} data-testid={`button-approve-viewer-${request.id}`}>
                                    <Check className="h-4 w-4 mr-1" />Onayla
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {approvedViewerRequests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Onaylanan ({approvedViewerRequests.length})
                        </h3>
                        <div className="grid gap-3">
                          {approvedViewerRequests.map((request) => (
                            <div key={request.id} className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                    {getStatusBadge(request.status)}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-muted-foreground" />{request.customerName}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{format(new Date(request.date), "d MMM", { locale: tr })} {request.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Izleyici: {getRequesterDisplayName(request)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => convertMutation.mutate(request.id)} disabled={convertMutation.isPending} data-testid={`button-convert-viewer-${request.id}`}>
                                    {convertMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                                    Rezervasyona Donustur
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {otherViewerRequests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Diger ({otherViewerRequests.length})</h3>
                        <div className="grid gap-3">
                          {otherViewerRequests.map((request) => (
                            <div key={request.id} className="bg-muted/50 border rounded-lg p-3 opacity-70">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                {getStatusBadge(request.status)}
                                <span>{request.customerName}</span>
                                <span className="text-muted-foreground">{format(new Date(request.date), "d MMM", { locale: tr })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processAction === "approve" ? "Talebi Onayla" : "Talebi Reddet"}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <div><strong>Musteri:</strong> {selectedRequest.customerName}</div>
                <div><strong>Aktivite:</strong> {getActivityName(selectedRequest.activityId)}</div>
                <div><strong>Tarih:</strong> {format(new Date(selectedRequest.date), "d MMMM yyyy", { locale: tr })} - {selectedRequest.time}</div>
                <div><strong>Kisi:</strong> {selectedRequest.guests || 1}</div>
              </div>
              <div className="space-y-2">
                <Label>Not (Opsiyonel)</Label>
                <Textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  placeholder={processAction === "approve" ? "Onay notu..." : "Red sebebi..."}
                  data-testid="textarea-process-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
              Iptal
            </Button>
            <Button
              onClick={handleProcess}
              disabled={processMutation.isPending}
              className={processAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              data-testid="button-confirm-process"
            >
              {processMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {processAction === "approve" ? "Onayla" : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
