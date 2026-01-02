import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Check, X, Clock, RefreshCw, ArrowLeft, Send, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface Agency {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

interface CustomerRequest {
  id: number;
  reservationId: number;
  requestType: string;
  requestDetails: string | null;
  preferredTime: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  status: string;
  adminNotes: string | null;
  emailSent: boolean | null;
  createdAt: string;
  processedAt: string | null;
}

export default function CustomerRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  
  // Agency notification state
  const [agencyDialogOpen, setAgencyDialogOpen] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [agencyMessage, setAgencyMessage] = useState("");
  const [isSendingAgencyNotification, setIsSendingAgencyNotification] = useState(false);

  const { data: customerRequests, isLoading, refetch } = useQuery<CustomerRequest[]>({
    queryKey: ['/api/customer-requests'],
    queryFn: async () => {
      const res = await fetch('/api/customer-requests');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: agencies } = useQuery<Agency[]>({
    queryKey: ['/api/agencies'],
  });

  const [pendingNotification, setPendingNotification] = useState<{ id: number; status: string } | null>(null);

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/customer-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-requests'] });
      toast({ title: "Basarili", description: "Talep durumu guncellendi." });
      // Store the pending notification to open after refetch
      setPendingNotification({ id: variables.id, status: variables.status });
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep guncellenemedi.", variant: "destructive" });
    },
  });

  // Effect to open notification dialog after status update
  useEffect(() => {
    if (pendingNotification && customerRequests && !notifyDialogOpen) {
      const updatedRequest = customerRequests.find(r => r.id === pendingNotification.id);
      if (updatedRequest && updatedRequest.status === pendingNotification.status && updatedRequest.customerPhone) {
        openNotifyDialog(updatedRequest);
      }
      setPendingNotification(null);
    }
  }, [pendingNotification, customerRequests, notifyDialogOpen]);

  const generateDefaultMessage = (request: CustomerRequest) => {
    const requestTypeText = getRequestTypeText(request.requestType);
    let message = `Merhaba ${request.customerName},\n\n`;
    
    if (request.status === 'approved') {
      message += `${requestTypeText} talebiniz onaylanmistir.\n\n`;
      if (request.requestType === 'time_change' && request.preferredTime) {
        message += `Yeni saatiniz: ${request.preferredTime}\n\n`;
      }
      if (request.requestType === 'cancellation') {
        message += `Rezervasyonunuz basariyla iptal edilmistir.\n\n`;
      }
    } else if (request.status === 'rejected') {
      message += `Uzgunum, ${requestTypeText.toLowerCase()} talebinizi su anda karsilayamiyoruz.\n\n`;
    } else {
      message += `${requestTypeText} talebiniz alindi ve degerlendiriliyor.\n\n`;
    }
    
    message += `Sorulariniz icin bize bu numaradan yazabilirsiniz.\n\nSky Fethiye`;
    return message;
  };

  const openNotifyDialog = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setNotifyMessage(generateDefaultMessage(request));
    setNotifyDialogOpen(true);
  };

  const sendWhatsAppNotification = async () => {
    if (!selectedRequest || !selectedRequest.customerPhone) {
      toast({ title: "Hata", description: "Musteri telefon numarasi bulunamadi.", variant: "destructive" });
      return;
    }
    
    setIsSendingNotification(true);
    try {
      const response = await fetch('/api/send-whatsapp-custom-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedRequest.customerPhone,
          message: notifyMessage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'WhatsApp mesaji gonderilemedi');
      }
      
      toast({ title: "Basarili", description: "Musteri WhatsApp ile bilgilendirildi." });
      setNotifyDialogOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'WhatsApp mesaji gonderilemedi';
      toast({ title: "Hata", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Agency notification functions
  const generateAgencyMessage = (request: CustomerRequest) => {
    const requestTypeText = getRequestTypeText(request.requestType);
    let message = `Musteri Talep Bildirimi\n\n`;
    message += `Musteri: ${request.customerName}\n`;
    message += `Talep: ${requestTypeText}\n`;
    
    if (request.status === 'approved') {
      message += `Durum: Onaylandi\n`;
      if (request.requestType === 'time_change' && request.preferredTime) {
        message += `Yeni Saat: ${request.preferredTime}\n`;
      }
    } else if (request.status === 'rejected') {
      message += `Durum: Reddedildi\n`;
    } else {
      message += `Durum: Beklemede\n`;
    }
    
    if (request.requestDetails) {
      message += `\nDetay: ${request.requestDetails}\n`;
    }
    
    message += `\nSky Fethiye`;
    return message;
  };

  const openAgencyDialog = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setAgencyMessage(generateAgencyMessage(request));
    setSelectedAgencyId("");
    setAgencyDialogOpen(true);
  };

  const sendAgencyNotification = async () => {
    if (!selectedAgencyId) {
      toast({ title: "Hata", description: "Lutfen bir acenta secin.", variant: "destructive" });
      return;
    }
    
    const selectedAgency = agencies?.find(a => String(a.id) === selectedAgencyId);
    if (!selectedAgency?.phone) {
      toast({ title: "Hata", description: "Secilen acentanin telefon numarasi bulunamadi.", variant: "destructive" });
      return;
    }
    
    setIsSendingAgencyNotification(true);
    try {
      const response = await fetch('/api/send-whatsapp-custom-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedAgency.phone,
          message: agencyMessage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'WhatsApp mesaji gonderilemedi');
      }
      
      toast({ title: "Basarili", description: `${selectedAgency.name} acentasina bildirim gonderildi.` });
      setAgencyDialogOpen(false);
      setSelectedRequest(null);
      setSelectedAgencyId("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'WhatsApp mesaji gonderilemedi';
      toast({ title: "Hata", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSendingAgencyNotification(false);
    }
  };

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'time_change': return 'Saat Degisikligi';
      case 'cancellation': return 'Iptal Talebi';
      case 'other': return 'Diger Talep';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Beklemede</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 gap-1"><Check className="w-3 h-3" />Onaylandi</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 gap-1"><X className="w-3 h-3" />Reddedildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const pendingCount = customerRequests?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <MessageSquare className="w-8 h-8 text-primary" />
              Musteri Talepleri
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {pendingCount} beklemede
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Musterilerden gelen saat degisikligi, iptal ve diger talepler
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Genel Bakis
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-requests"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tum Talepler</CardTitle>
            <CardDescription>
              Son gelen talepler en ustte gosterilir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
            ) : !customerRequests || customerRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">Henuz musteri talebi yok</p>
                <p className="text-sm mt-1">Musteriler takip sayfasindan talep gonderebilir</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {customerRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-lg">{request.customerName}</span>
                            <Badge variant="outline">
                              {getRequestTypeText(request.requestType)}
                            </Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-x-3">
                            {request.customerPhone && <span>{request.customerPhone}</span>}
                            {request.customerEmail && <span>{request.customerEmail}</span>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(request.createdAt).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      
                      {request.requestType === 'time_change' && request.preferredTime && (
                        <div className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-200 dark:border-blue-800">
                          <span className="text-muted-foreground">Tercih edilen saat:</span>{' '}
                          <span className="font-medium">{request.preferredTime}</span>
                        </div>
                      )}
                      
                      {request.requestDetails && (
                        <p className="text-sm bg-muted/50 p-3 rounded">{request.requestDetails}</p>
                      )}
                      
                      <div className="flex gap-2 pt-3 border-t flex-wrap">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 dark:border-green-800"
                              onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'approved' })}
                              disabled={updateRequestMutation.isPending}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 dark:border-red-800"
                              onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'rejected' })}
                              disabled={updateRequestMutation.isPending}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reddet
                            </Button>
                          </>
                        )}
                        {request.customerPhone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 dark:border-blue-800"
                            onClick={() => openNotifyDialog(request)}
                            data-testid={`button-notify-${request.id}`}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Bilgilendir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-200 dark:border-orange-800"
                          onClick={() => openAgencyDialog(request)}
                          data-testid={`button-notify-agency-${request.id}`}
                        >
                          <Building2 className="w-4 h-4 mr-1" />
                          Acentayi Bilgilendir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Musteriyi Bilgilendir
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <div className="text-sm space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p><span className="text-muted-foreground">Musteri:</span> {selectedRequest.customerName}</p>
                  <p><span className="text-muted-foreground">Telefon:</span> {selectedRequest.customerPhone}</p>
                  <p><span className="text-muted-foreground">Talep:</span> {getRequestTypeText(selectedRequest.requestType)}</p>
                  <p><span className="text-muted-foreground">Durum:</span> {selectedRequest.status === 'approved' ? 'Onaylandi' : selectedRequest.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="notifyMessage">WhatsApp Mesaji</Label>
                <Textarea
                  id="notifyMessage"
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  rows={8}
                  className="resize-none"
                  placeholder="Museteriye gonderilecek mesaj..."
                  data-testid="textarea-notify-message"
                />
                <p className="text-xs text-muted-foreground">
                  Mesaji duzenleyebilir veya varsayilan metni kullanabilirsiniz.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setNotifyDialogOpen(false)}
                disabled={isSendingNotification}
              >
                Iptal
              </Button>
              <Button
                onClick={sendWhatsAppNotification}
                disabled={isSendingNotification || !notifyMessage.trim()}
                data-testid="button-send-notification"
              >
                {isSendingNotification ? "Gonderiliyor..." : "WhatsApp ile Gonder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={agencyDialogOpen} onOpenChange={setAgencyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                Acentayi Bilgilendir
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <div className="text-sm space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p><span className="text-muted-foreground">Musteri:</span> {selectedRequest.customerName}</p>
                  <p><span className="text-muted-foreground">Talep:</span> {getRequestTypeText(selectedRequest.requestType)}</p>
                  <p><span className="text-muted-foreground">Durum:</span> {selectedRequest.status === 'approved' ? 'Onaylandi' : selectedRequest.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="agencySelect">Acenta Secin</Label>
                <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                  <SelectTrigger data-testid="select-agency">
                    <SelectValue placeholder="Acenta secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies?.filter(a => a.phone).map((agency) => (
                      <SelectItem key={agency.id} value={String(agency.id)}>
                        {agency.name} {agency.phone ? `(${agency.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!agencies || agencies.length === 0) && (
                  <p className="text-xs text-orange-600">Sistemde kayitli acenta bulunamadi. Once Finans sayfasindan acenta ekleyin.</p>
                )}
                {agencies && agencies.length > 0 && agencies.filter(a => a.phone).length === 0 && (
                  <p className="text-xs text-orange-600">Telefon numarasi olan acenta bulunamadi.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="agencyMessage">WhatsApp Mesaji</Label>
                <Textarea
                  id="agencyMessage"
                  value={agencyMessage}
                  onChange={(e) => setAgencyMessage(e.target.value)}
                  rows={8}
                  className="resize-none"
                  placeholder="Acentaya gonderilecek mesaj..."
                  data-testid="textarea-agency-message"
                />
                <p className="text-xs text-muted-foreground">
                  Mesaji duzenleyebilir veya varsayilan metni kullanabilirsiniz.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setAgencyDialogOpen(false)}
                disabled={isSendingAgencyNotification}
              >
                Iptal
              </Button>
              <Button
                onClick={sendAgencyNotification}
                disabled={isSendingAgencyNotification || !agencyMessage.trim() || !selectedAgencyId}
                data-testid="button-send-agency-notification"
              >
                {isSendingAgencyNotification ? "Gonderiliyor..." : "WhatsApp ile Gonder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
