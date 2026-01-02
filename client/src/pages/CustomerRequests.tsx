import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/layout/Sidebar";
import { MessageSquare, Check, X, Clock, RefreshCw, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

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

  const { data: customerRequests, isLoading, refetch } = useQuery<CustomerRequest[]>({
    queryKey: ['/api/customer-requests'],
    queryFn: async () => {
      const res = await fetch('/api/customer-requests');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/customer-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-requests'] });
      toast({ title: "Basarili", description: "Talep durumu guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep guncellenemedi.", variant: "destructive" });
    },
  });

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
                      
                      {request.status === 'pending' && (
                        <div className="flex gap-2 pt-3 border-t">
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
