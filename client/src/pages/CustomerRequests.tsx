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
import { MessageSquare, Check, X, Clock, RefreshCw, ArrowLeft, Send, Building2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface Agency {
  id: number;
  name: string;
  contactInfo: string | null;
  notes: string | null;
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
    queryKey: ['/api/finance/agencies'],
  });

  const [pendingNotification, setPendingNotification] = useState<{ id: number; status: string } | null>(null);

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/customer-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-requests'] });
      toast({ title: "Başarılı", description: "Talep durumu güncellendi." });
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
    setAgencyMessage(generateAgencyMessage(request));
    setSelectedAgencyId("");
    setNotifyDialogOpen(true);
  };

  const sendWhatsAppNotification = async () => {
    if (!selectedRequest || !selectedRequest.customerPhone) {
      toast({ title: "Hata", description: "Müşteri telefon numarası bulunamadı.", variant: "destructive" });
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
        throw new Error(errorData.error || 'WhatsApp mesajı gönderilemedi');
      }
      
      toast({ title: "Başarılı", description: "Müşteri WhatsApp ile bilgilendirildi." });
      setNotifyDialogOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'WhatsApp mesajı gönderilemedi';
      toast({ title: "Hata", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Agency notification functions
  const generateAgencyMessage = (request: CustomerRequest) => {
    const requestTypeText = getRequestTypeText(request.requestType);
    let message = `Müşteri Talep Bildirimi\n\n`;
    message += `Müşteri: ${request.customerName}\n`;
    message += `Talep: ${requestTypeText}\n`;
    
    if (request.status === 'approved') {
      message += `Durum: Onaylandı\n`;
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

  const sendAgencyNotification = async () => {
    if (!selectedAgencyId) {
      toast({ title: "Hata", description: "Lütfen bir acenta seçin.", variant: "destructive" });
      return;
    }
    
    const selectedAgency = agencies?.find(a => String(a.id) === selectedAgencyId);
    if (!selectedAgency?.contactInfo) {
      toast({ title: "Hata", description: "Seçilen acentanın iletişim bilgisi bulunamadı.", variant: "destructive" });
      return;
    }
    
    setIsSendingAgencyNotification(true);
    try {
      const response = await fetch('/api/send-whatsapp-custom-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedAgency.contactInfo,
          message: agencyMessage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'WhatsApp mesajı gönderilemedi');
      }
      
      toast({ title: "Başarılı", description: `${selectedAgency.name} acentasına bildirim gönderildi.` });
      setAgencyDialogOpen(false);
      setSelectedRequest(null);
      setSelectedAgencyId("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'WhatsApp mesajı gönderilemedi';
      toast({ title: "Hata", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSendingAgencyNotification(false);
    }
  };

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'time_change': return 'Saat Değişikliği';
      case 'cancellation': return 'İptal Talebi';
      case 'other': return 'Diğer Talep';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Beklemede</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 gap-1"><Check className="w-3 h-3" />Onaylandı</Badge>;
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
              Müşteri Talepleri
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {pendingCount} beklemede
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Müşterilerden gelen saat değişikliği, iptal ve diğer talepler
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Genel Bakış
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
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Combined Notification Dialog - Customer & Agency */}
        <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Bilgilendirme Gönder</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Talep işlendi. Aşağıdaki kişilere bildirim göndermek ister misiniz?
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
                        <p className="text-xs text-muted-foreground">{selectedRequest.customerName} - {selectedRequest.customerPhone || 'Telefon yok'}</p>
                      </div>
                    </div>
                    <Textarea
                      value={notifyMessage}
                      onChange={(e) => setNotifyMessage(e.target.value)}
                      className="min-h-[120px] text-sm"
                      placeholder="Müşteriye gönderilecek mesaj..."
                      data-testid="textarea-notify-message"
                    />
                    <div className="flex justify-end">
                      <Button 
                        size="sm"
                        disabled={isSendingNotification || !selectedRequest.customerPhone || !notifyMessage.trim()}
                        onClick={sendWhatsAppNotification}
                        data-testid="button-send-notification"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {isSendingNotification ? "Gönderiliyor..." : "Müşteriye Gönder"}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Agency Notification Section */}
                <Card className="p-4 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Acenta Bildirimi</p>
                        <p className="text-xs text-muted-foreground">Acentayı seçin ve bildirim gönderin</p>
                      </div>
                    </div>
                    <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                      <SelectTrigger data-testid="select-agency">
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
                      value={agencyMessage}
                      onChange={(e) => setAgencyMessage(e.target.value)}
                      className="min-h-[100px] text-sm"
                      placeholder="Acentaya gönderilecek mesaj..."
                      data-testid="textarea-agency-message"
                    />
                    <div className="flex justify-end">
                      <Button 
                        size="sm"
                        disabled={isSendingAgencyNotification || !selectedAgencyId || !agencyMessage.trim()}
                        onClick={sendAgencyNotification}
                        data-testid="button-send-agency-notification"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {isSendingAgencyNotification ? "Gönderiliyor..." : "Acentaya Gönder"}
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
                    Kapat
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
