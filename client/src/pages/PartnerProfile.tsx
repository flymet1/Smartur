import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ClipboardList, Calendar, User, Clock, Users, MapPin, CheckCircle, XCircle, HourglassIcon, Trash2, Wallet, Check, X, AlertCircle, MessageSquare, Phone, Ban, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReservationRequest {
  id: number;
  activityId: number;
  activityName: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  guests: number;
  notes?: string;
  status: string;
  processNotes?: string;
  createdAt: string;
}

interface Reservation {
  id: number;
  activityId: number | null;
  activityName: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  quantity: number;
  status: string | null;
  source: string | null;
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

interface ViewerCustomerRequest {
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
  createdAt: string;
  processedAt: string | null;
  activityName?: string;
  reservationDate?: string;
  reservationTime?: string;
}

export default function PartnerProfile() {
  const { toast } = useToast();

  const { data: myRequests, isLoading: requestsLoading } = useQuery<ReservationRequest[]>({
    queryKey: ["/api/my-reservation-requests"],
  });

  const { data: myReservations, isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/my-reservations"],
  });

  const { data: partnerTransactions, isLoading: transactionsLoading } = useQuery<PartnerTransaction[]>({
    queryKey: ["/api/partner-transactions"],
  });

  const { data: viewerRequests, isLoading: viewerRequestsLoading, refetch: refetchViewerRequests } = useQuery<ViewerCustomerRequest[]>({
    queryKey: ["/api/viewer-customer-requests"],
  });

  const updateViewerRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest('PATCH', `/api/customer-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/viewer-customer-requests'] });
      toast({ title: "Basarili", description: "Talep durumu guncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Talep guncellenemedi", variant: "destructive" });
    }
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/partner-transactions/${id}/request-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Silme talebi gonderildi", description: "Onay bekleniyor" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Silme talebi gonderilemedi", variant: "destructive" });
    }
  });

  const approveDeletionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/partner-transactions/${id}/approve-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Silme talebi onaylandi", description: "Islem silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Silme talebi onaylanamadi", variant: "destructive" });
    }
  });

  const rejectDeletionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      return await apiRequest('POST', `/api/partner-transactions/${id}/reject-deletion`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Silme talebi reddedildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Islem yapilamadi", variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><HourglassIcon className="w-3 h-3 mr-1" />Beklemede</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircle className="w-3 h-3 mr-1" />Onaylandi</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Reddedildi</Badge>;
      case "converted":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Rezervasyona Donusturuldu</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Onaylandi</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Iptal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatMoney = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
  };

  const pendingCount = myRequests?.filter(r => r.status === "pending").length || 0;
  const approvedCount = myRequests?.filter(r => r.status === "approved" || r.status === "converted").length || 0;
  const rejectedCount = myRequests?.filter(r => r.status === "rejected").length || 0;
  const transactionCount = partnerTransactions?.length || 0;
  const pendingViewerRequestCount = viewerRequests?.filter(r => r.status === "pending").length || 0;

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'time_change': return 'Saat Degisikligi';
      case 'cancellation': return 'Iptal Talebi';
      case 'other': return 'Diger Talep';
      default: return type;
    }
  };

  const getViewerRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Beklemede</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><Check className="w-3 h-3 mr-1" />Onaylandi</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><X className="w-3 h-3 mr-1" />Reddedildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <User className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Izleyiciler</h1>
          <p className="text-muted-foreground">Rezervasyon talepleriniz ve durumlarini buradan takip edebilirsiniz</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Talepler</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <HourglassIcon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Onaylanan Talepler</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Reddedilen Talepler</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Islemlerim</p>
                <p className="text-2xl font-bold">{transactionCount}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingViewerRequestCount > 0 ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-600' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className={`text-sm ${pendingViewerRequestCount > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>Musteri Talepleri</p>
                <p className={`text-2xl font-bold ${pendingViewerRequestCount > 0 ? 'text-orange-600' : ''}`}>{pendingViewerRequestCount}</p>
              </div>
              <div className={`p-3 rounded-full ${pendingViewerRequestCount > 0 ? 'bg-orange-200 text-orange-700 dark:bg-orange-800/50 dark:text-orange-300' : 'bg-muted'}`}>
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="requests" className="gap-2" data-testid="tab-requests">
            <ClipboardList className="w-4 h-4" />
            Taleplerim
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-2" data-testid="tab-reservations">
            <Calendar className="w-4 h-4" />
            Rezervasyonlarim
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2" data-testid="tab-transactions">
            <Wallet className="w-4 h-4" />
            Islemlerim
          </TabsTrigger>
          <TabsTrigger value="viewer-requests" className="gap-2" data-testid="tab-viewer-requests">
            <MessageSquare className="w-4 h-4" />
            Musteri Talepleri
            {pendingViewerRequestCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">{pendingViewerRequestCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          {requestsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : myRequests && myRequests.length > 0 ? (
            <div className="space-y-4">
              {myRequests.map(request => (
                <Card key={request.id} data-testid={`card-request-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{request.customerName}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {request.activityName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(request.date), "d MMMM yyyy", { locale: tr })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {request.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {request.guests} kisi
                          </span>
                        </div>
                        {request.notes && (
                          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            Not: {request.notes}
                          </p>
                        )}
                        {request.processNotes && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            Operator Notu: {request.processNotes}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(request.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Henuz rezervasyon talebiniz bulunmuyor.</p>
                <p className="text-sm mt-2">Musaitlik sayfasindan yeni talep olusturabilirsiniz.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          {reservationsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : myReservations && myReservations.length > 0 ? (
            <div className="space-y-4">
              {myReservations.map(reservation => (
                <Card key={reservation.id} data-testid={`card-reservation-${reservation.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{reservation.customerName}</h3>
                          {getStatusBadge(reservation.status || "pending")}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {reservation.activityName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(reservation.date), "d MMMM yyyy", { locale: tr })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {reservation.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {reservation.quantity} kisi
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Henuz onaylanmis rezervasyonunuz bulunmuyor.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          {transactionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : partnerTransactions && partnerTransactions.length > 0 ? (
            <div className="space-y-4">
              {partnerTransactions.map(tx => {
                const isSender = tx.senderTenantId === tx.currentTenantId;
                const partnerName = isSender ? tx.receiverTenantName : tx.senderTenantName;
                const hasPendingDeletion = tx.deletionStatus === 'pending';
                const canRequestDeletion = !tx.deletionStatus;
                const canApproveDeletion = hasPendingDeletion && tx.deletionRequestedByTenantId !== tx.currentTenantId;
                const isMyDeletionRequest = hasPendingDeletion && tx.deletionRequestedByTenantId === tx.currentTenantId;

                return (
                  <Card key={tx.id} data-testid={`card-transaction-${tx.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{tx.customerName}</h3>
                            <Badge variant={isSender ? "outline" : "default"} className={isSender ? "border-blue-500 text-blue-600" : "bg-green-600"}>
                              {isSender ? "Gonderilen" : "Gelen"}
                            </Badge>
                            {hasPendingDeletion && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Silme Talebi Bekliyor
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {tx.activityName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(tx.reservationDate), "d MMMM yyyy", { locale: tr })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {tx.reservationTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {tx.guestCount} kisi
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium">{formatMoney(tx.totalPrice, tx.currency)}</span>
                            <span className="text-muted-foreground">Acenta: {partnerName}</span>
                          </div>
                          {tx.notes && (
                            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              {tx.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(tx.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                          </span>
                          
                          {canRequestDeletion && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300"
                              onClick={() => requestDeletionMutation.mutate(tx.id)}
                              disabled={requestDeletionMutation.isPending}
                              data-testid={`button-request-deletion-${tx.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Silme Talebi
                            </Button>
                          )}

                          {isMyDeletionRequest && (
                            <p className="text-xs text-orange-600">Silme talebiniz onay bekliyor</p>
                          )}

                          {canApproveDeletion && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => approveDeletionMutation.mutate(tx.id)}
                                disabled={approveDeletionMutation.isPending}
                                data-testid={`button-approve-deletion-${tx.id}`}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Onayla
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300"
                                onClick={() => rejectDeletionMutation.mutate({ id: tx.id })}
                                disabled={rejectDeletionMutation.isPending}
                                data-testid={`button-reject-deletion-${tx.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reddet
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Henuz isleminiz bulunmuyor.</p>
                <p className="text-sm mt-2">Rezervasyonlariniz onaylandiktan sonra islemler burada gorunecek.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="viewer-requests" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Izleyici Musteri Talepleri</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchViewerRequests()}
              data-testid="button-refresh-viewer-requests"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </Button>
          </div>
          {viewerRequestsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : viewerRequests && viewerRequests.length > 0 ? (
            <div className="space-y-4">
              {viewerRequests.map(request => (
                <Card key={request.id} className={request.status === 'pending' ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20' : ''} data-testid={`card-viewer-request-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{request.customerName}</h3>
                          {getViewerRequestStatusBadge(request.status)}
                          <Badge variant="outline" className={request.requestType === 'cancellation' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : ''}>
                            {request.requestType === 'cancellation' ? <Ban className="w-3 h-3 mr-1" /> : null}
                            {getRequestTypeText(request.requestType)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {request.customerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {request.customerPhone}
                            </span>
                          )}
                          {request.activityName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {request.activityName}
                            </span>
                          )}
                          {request.reservationDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(request.reservationDate), "d MMMM yyyy", { locale: tr })}
                            </span>
                          )}
                          {request.reservationTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {request.reservationTime}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(request.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                          </span>
                        </div>
                        {request.requestDetails && (
                          <p className="text-sm bg-muted/50 p-2 rounded mt-2">
                            <strong>Detay:</strong> {request.requestDetails}
                          </p>
                        )}
                        {request.preferredTime && request.requestType === 'time_change' && (
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            <strong>Tercih edilen saat:</strong> {request.preferredTime}
                          </p>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateViewerRequestMutation.mutate({ id: request.id, status: 'approved' })}
                            disabled={updateViewerRequestMutation.isPending}
                            data-testid={`button-approve-viewer-request-${request.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300"
                            onClick={() => updateViewerRequestMutation.mutate({ id: request.id, status: 'rejected' })}
                            disabled={updateViewerRequestMutation.isPending}
                            data-testid={`button-reject-viewer-request-${request.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reddet
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Henuz musteri talebi bulunmuyor.</p>
                <p className="text-sm mt-2">Izleyicilerin musteri talepleri burada gorunecek.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
