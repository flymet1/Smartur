import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useReservations } from "@/hooks/use-reservations";
import { Bell, ClipboardList, X, Clock, Package, ChevronDown, RefreshCw, Check, XCircle, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Activity, PackageTour, Reservation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Dashboard() {
  const [reservationsDialogOpen, setReservationsDialogOpen] = useState(false);
  
  const getLastViewedTimestamp = () => {
    const stored = localStorage.getItem('lastViewedReservations');
    return stored ? new Date(stored) : new Date(0);
  };
  
  const [lastViewedTime, setLastViewedTime] = useState<Date>(getLastViewedTimestamp);
  
  const { data: reservations, isLoading } = useReservations();
  
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  const { data: packageTours = [] } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });

  interface ChangeRequest {
    id: number;
    reservationId: number;
    tenantId: number;
    initiatedByType: string;
    initiatedById: number | null;
    requestType: string;
    originalDate: string | null;
    originalTime: string | null;
    requestedDate: string | null;
    requestedTime: string | null;
    requestDetails: string | null;
    status: string;
    processNotes: string | null;
    processedBy: number | null;
    processedAt: string | null;
    createdAt: string;
    reservation: Reservation | null;
  }

  const { data: changeRequests = [], refetch: refetchChangeRequests } = useQuery<ChangeRequest[]>({
    queryKey: ['/api/reservation-change-requests'],
    refetchInterval: 30000,
  });

  const pendingChangeRequests = changeRequests.filter(r => r.status === 'pending');
  const { toast } = useToast();

  const handleChangeRequestAction = async (id: number, action: 'approved' | 'rejected') => {
    try {
      await apiRequest('PATCH', `/api/reservation-change-requests/${id}`, { status: action });
      refetchChangeRequests();
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({
        title: action === 'approved' ? 'Talep Onaylandı' : 'Talep Reddedildi',
        description: action === 'approved' 
          ? 'Rezervasyon değişikliği uygulandı' 
          : 'Değişiklik talebi reddedildi',
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'İşlem gerçekleştirilemedi',
        variant: 'destructive',
      });
    }
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/reservations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
    },
  });

  const newReservationsCount = reservations?.filter(r => {
    if (!r.createdAt) return false;
    const createdAt = new Date(r.createdAt);
    return !isNaN(createdAt.getTime()) && createdAt > lastViewedTime;
  }).length || 0;
  
  const newReservations = reservations?.filter(r => {
    if (!r.createdAt) return false;
    const createdAt = new Date(r.createdAt);
    return !isNaN(createdAt.getTime()) && createdAt > lastViewedTime;
  }).slice(0, 10) || [];
  
  const markReservationsAsViewed = () => {
    const now = new Date();
    localStorage.setItem('lastViewedReservations', now.toISOString());
    setLastViewedTime(now);
  };

  const getActivityName = (activityId: number | null) => {
    if (!activityId) return "Bilinmiyor";
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };

  const getPackageTourName = (packageTourId: number | null) => {
    if (!packageTourId) return null;
    return packageTours.find(p => p.id === packageTourId)?.name || null;
  };

  const getStatusBadge = (status: string, reservationId: number) => {
    const statusConfig = {
      confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" },
      pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200" },
      cancelled: { label: "İptal", className: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" },
    };
    const current = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "" };
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${current.className} cursor-pointer flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border`}
            data-testid={`button-status-${reservationId}`}
          >
            {current.label}
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[100]">
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'pending' })}
            className="text-yellow-700"
          >
            Beklemede
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'confirmed' })}
            className="text-green-700"
          >
            Onaylı
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'cancelled' })}
            className="text-red-700"
          >
            İptal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Genel Bakış</h1>
            <p className="text-muted-foreground mt-1">Hoş geldiniz, bugünün operasyon özeti.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/reservations?date=${format(new Date(), "yyyy-MM-dd")}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" data-testid="button-today-reservations">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Bugünün Rezervasyonları
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bugünün rezervasyonlarını görüntüle</TooltipContent>
              </Tooltip>
            </Link>
            <div 
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border shadow-sm hover-elevate cursor-pointer ${
                newReservationsCount > 0 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                  : 'bg-white dark:bg-card text-muted-foreground border-border'
              }`} 
              onClick={() => setReservationsDialogOpen(true)}
              data-testid="button-new-reservations"
            >
              <Bell className="w-4 h-4" />
              <span>{newReservationsCount > 0 ? `${newReservationsCount} Yeni Rezervasyon` : 'Yeni Rezervasyon Yok'}</span>
            </div>
          </div>
        </div>

        {/* Değişiklik Talepleri Kartı */}
        {pendingChangeRequests.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-orange-600" />
                Bekleyen Değişiklik Talepleri
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                  {pendingChangeRequests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingChangeRequests.slice(0, 5).map(request => (
                <div 
                  key={request.id} 
                  className="p-3 bg-background rounded-lg border flex flex-col sm:flex-row justify-between gap-3"
                  data-testid={`change-request-${request.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{request.reservation?.customerName || 'Bilinmeyen'}</span>
                      <Badge variant="outline" className="text-xs">
                        {request.initiatedByType === 'customer' ? 'Müşteri' : 
                         request.initiatedByType === 'viewer' ? 'İzleyici' : 'Partner'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {request.originalDate} {request.originalTime}
                        {' → '}
                        <span className="text-foreground font-medium">
                          {request.requestedDate} {request.requestedTime}
                        </span>
                      </span>
                    </div>
                    {request.requestDetails && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{request.requestDetails}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleChangeRequestAction(request.id, 'approved')}
                          data-testid={`button-approve-${request.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Onayla</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleChangeRequestAction(request.id, 'rejected')}
                          data-testid={`button-reject-${request.id}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reddet</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
              {pendingChangeRequests.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{pendingChangeRequests.length - 5} daha fazla talep
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">Rezervasyonları Görüntüle</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Tüm rezervasyonlarınızı takvim görünümünde görmek ve yönetmek için Rezervasyonlar sayfasına gidin.
          </p>
          <Link href="/reservations">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="lg" data-testid="button-go-to-reservations">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Rezervasyonlara Git
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tüm rezervasyonları görüntüle</TooltipContent>
            </Tooltip>
          </Link>
        </div>

      </main>

      <Dialog open={reservationsDialogOpen} onOpenChange={setReservationsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Yeni Rezervasyonlar
              {newReservationsCount > 0 && (
                <Badge className="ml-2">{newReservationsCount}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {newReservations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Yeni rezervasyon bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {newReservations.map(res => {
                const packageTourName = getPackageTourName(res.packageTourId);
                return (
                  <Card key={res.id} className={packageTourName ? "border-purple-200 dark:border-purple-800" : ""}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{res.customerName}</span>
                            {packageTourName && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                <Package className="w-3 h-3 mr-1" />
                                {packageTourName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{getActivityName(res.activityId)}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {res.date} {res.time}
                            </span>
                            <span>{res.quantity} kişi</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(res.status || 'pending', res.id)}
                          {(res.priceTl || res.priceUsd) && (
                            <span className="text-sm font-medium">
                              {res.priceTl ? `₺${res.priceTl.toLocaleString('tr-TR')}` : ''}
                              {res.priceTl && res.priceUsd ? ' / ' : ''}
                              {res.priceUsd ? `$${res.priceUsd.toLocaleString('en-US')}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <div className="flex justify-between items-center pt-4 border-t">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={markReservationsAsViewed} data-testid="button-mark-viewed">
                      Tümünü Görüldü İşaretle
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tüm yeni rezervasyonları görüldü olarak işaretle</TooltipContent>
                </Tooltip>
                <Link href="/reservations">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button data-testid="button-view-all">Tüm Rezervasyonlar</Button>
                    </TooltipTrigger>
                    <TooltipContent>Tüm rezervasyonları görüntüle</TooltipContent>
                  </Tooltip>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
