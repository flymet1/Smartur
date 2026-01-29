import { Fragment } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Reservation, Activity, PackageTour } from "@shared/schema";
import { MessageSquare, Globe, User, Package, ChevronDown, Link2, Copy, Check, MoreHorizontal, Bus, Hotel, Star, StickyNote, Handshake, Send, CheckCircle, XCircle, ArrowRightLeft, Phone } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReservationTableProps {
  reservations: Reservation[];
  onReservationSelect?: (reservation: Reservation) => void;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
  onSelectAll?: () => void;
  onWhatsAppNotify?: (reservation: Reservation) => void;
  onAddDispatch?: (reservation: Reservation) => void;
  onNotifyAgency?: (reservation: Reservation) => void;
}

export function ReservationTable({ 
  reservations, 
  onReservationSelect, 
  selectedIds, 
  onToggleSelection, 
  onSelectAll,
  onWhatsAppNotify,
  onAddDispatch,
  onNotifyAgency
}: ReservationTableProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const hasSelection = selectedIds !== undefined && onToggleSelection !== undefined;
  
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  const { data: packageTours = [] } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });

  // Fetch dispatches to check which reservations have dispatches
  const { data: dispatches = [] } = useQuery<{ id: number; customerName: string | null; dispatchDate: string; activityId: number | null }[]>({
    queryKey: ['/api/finance/dispatches']
  });

  // Create a lookup set for reservations that have dispatches (by activityId + date, and optionally customerName)
  const dispatchLookup = useMemo(() => {
    const lookup = new Set<string>();
    dispatches.forEach(d => {
      if (d.dispatchDate) {
        // Primary key: activityId + date
        if (d.activityId) {
          lookup.add(`activity-${d.activityId}-${d.dispatchDate}`);
        }
        // Secondary key: customerName + date (if available)
        if (d.customerName) {
          lookup.add(`customer-${d.customerName.toLowerCase().trim()}-${d.dispatchDate}`);
        }
      }
    });
    return lookup;
  }, [dispatches]);

  const hasDispatch = (res: Reservation) => {
    // Check by activityId + date first, then by customerName + date
    const activityKey = `activity-${res.activityId}-${res.date}`;
    const customerKey = `customer-${res.customerName.toLowerCase().trim()}-${res.date}`;
    return dispatchLookup.has(activityKey) || dispatchLookup.has(customerKey);
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/reservations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: "Başarili", description: "Rezervasyon durumu güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
    },
  });

  const trackingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/reservations/${id}/generate-tracking`);
      return response.json();
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      const trackingUrl = `${window.location.origin}/takip/${data.token}`;
      navigator.clipboard.writeText(trackingUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ 
        title: "Takip Linki Oluşturuldu", 
        description: "Link panoya kopyalandı. WhatsApp'tan müşteriye gönderebilirsiniz." 
      });
    },
    onError: () => {
      toast({ title: "Hata", description: "Takip linki oluşturulamadı.", variant: "destructive" });
    },
  });

  const copyExistingLink = async (token: string, id: number) => {
    const trackingUrl = `${window.location.origin}/takip/${token}`;
    await navigator.clipboard.writeText(trackingUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Kopyalandı", description: "Takip linki panoya kopyalandı." });
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
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer ${current.className}`}
            data-testid={`button-status-${reservationId}`}
          >
            {current.label}
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem 
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'pending' })}
            className="text-yellow-700"
            data-testid={`status-pending-${reservationId}`}
          >
            Beklemede
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'confirmed' })}
            className="text-green-700"
            data-testid={`status-confirmed-${reservationId}`}
          >
            Onaylı
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'cancelled' })}
            className="text-red-700"
            data-testid={`status-cancelled-${reservationId}`}
          >
            İptal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const getSourceIcon = (source: string | null) => {
    switch (source) {
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'web':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'partner':
        return <Handshake className="h-4 w-4 text-purple-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSourceLabel = (source: string | null, notes?: string | null) => {
    switch (source) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'web':
        return 'Web';
      case 'partner':
        // Extract partner name from notes format "[Partner: Name]"
        const partnerMatch = notes?.match(/\[Partner:\s*([^\]]+)\]/);
        return partnerMatch ? partnerMatch[1] : 'Acenta';
      case 'manual':
        return 'Manuel';
      default:
        return source || 'Manuel';
    }
  };

  const groupedReservations = useMemo(() => {
    const packageGroups = new Map<string, Reservation[]>();
    const standaloneReservations: Reservation[] = [];
    
    reservations.forEach(r => {
      if (r.packageTourId) {
        const groupKey = `${r.packageTourId}-${r.orderNumber || r.customerName}`;
        const existing = packageGroups.get(groupKey) || [];
        existing.push(r);
        packageGroups.set(groupKey, existing);
      } else {
        standaloneReservations.push(r);
      }
    });
    
    const result: { type: 'group' | 'single'; groupKey?: string; reservations: Reservation[] }[] = [];
    
    packageGroups.forEach((groupRes, groupKey) => {
      result.push({ type: 'group', groupKey, reservations: groupRes });
    });
    
    standaloneReservations.forEach(res => {
      result.push({ type: 'single', reservations: [res] });
    });
    
    return result;
  }, [reservations]);

  // Mobile Card View Component
  const MobileCardView = () => (
    <div className="space-y-3 md:hidden">
      {reservations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Henüz rezervasyon bulunmuyor.
        </div>
      ) : (
        groupedReservations.map((group, groupIdx) => (
          <Fragment key={group.type === 'group' ? group.groupKey : `single-${groupIdx}`}>
            {group.type === 'group' && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-600 rounded-lg p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-700 dark:text-purple-300">
                    {getPackageTourName(group.reservations[0].packageTourId)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {group.reservations.length} aktivite
                  </Badge>
                </div>
              </div>
            )}
            {group.reservations.map((res) => (
              <div 
                key={res.id}
                className={`rounded-lg border p-3 space-y-2 hover-elevate ${onReservationSelect ? 'cursor-pointer' : ''} ${group.type === 'group' ? 'border-purple-200 dark:border-purple-800 ml-2' : ''} ${selectedIds?.has(res.id) ? 'bg-primary/5 border-primary' : 'bg-card'}`}
                onClick={() => onReservationSelect?.(res)}
              >
                {/* Header Row: Name, Status, Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {hasSelection && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.has(res.id)}
                          onCheckedChange={() => onToggleSelection(res.id)}
                          data-testid={`checkbox-reservation-mobile-${res.id}`}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate" data-testid={`text-customer-name-mobile-${res.id}`}>{res.customerName}</div>
                      <div 
                        className="text-xs text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/messages?phone=${encodeURIComponent(res.customerPhone)}`;
                        }}
                        data-testid={`link-phone-mobile-${res.id}`}
                      >
                        {res.customerPhone}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {getStatusBadge(res.status || 'pending', res.id)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-mobile-${res.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {res.status !== 'confirmed' && (
                          <DropdownMenuItem 
                            onClick={() => statusMutation.mutate({ id: res.id, status: 'confirmed' })}
                            data-testid={`action-confirm-mobile-${res.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Onayla
                          </DropdownMenuItem>
                        )}
                        {res.status !== 'cancelled' && (
                          <DropdownMenuItem 
                            onClick={() => statusMutation.mutate({ id: res.id, status: 'cancelled' })}
                            data-testid={`action-cancel-mobile-${res.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            İptal Et
                          </DropdownMenuItem>
                        )}
                        {onWhatsAppNotify && (
                          <DropdownMenuItem 
                            onClick={() => onWhatsAppNotify(res)}
                            data-testid={`action-whatsapp-mobile-${res.id}`}
                          >
                            <Send className="h-4 w-4 mr-2 text-green-600" />
                            Müşteriye WhatsApp Bildirimi
                          </DropdownMenuItem>
                        )}
                        {onAddDispatch && (
                          <DropdownMenuItem 
                            onClick={() => onAddDispatch(res)}
                            data-testid={`action-dispatch-mobile-${res.id}`}
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-600" />
                            Partner Acentaya Gönder
                          </DropdownMenuItem>
                        )}
                        {onNotifyAgency && (
                          <DropdownMenuItem 
                            onClick={() => onNotifyAgency(res)}
                            data-testid={`action-notify-agency-mobile-${res.id}`}
                          >
                            <Phone className="h-4 w-4 mr-2 text-green-600" />
                            Acentaya WhatsApp Bildirimi
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {res.trackingToken ? (
                          <>
                            <DropdownMenuItem 
                              onClick={() => copyExistingLink(res.trackingToken!, res.id)}
                              data-testid={`copy-tracking-mobile-${res.id}`}
                            >
                              {copiedId === res.id ? (
                                <>
                                  <Check className="h-4 w-4 mr-2 text-green-600" />
                                  Kopyalandı
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Takip Linkini Kopyala
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                const trackingUrl = `${window.location.origin}/takip/${res.trackingToken}`;
                                window.open(trackingUrl, '_blank');
                              }}
                              data-testid={`open-tracking-mobile-${res.id}`}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Takip Sayfasını Aç
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => trackingMutation.mutate(res.id)}
                            disabled={trackingMutation.isPending}
                            data-testid={`generate-tracking-mobile-${res.id}`}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Takip Linki Oluştur
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Activity & Date Row */}
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">{getActivityName(res.activityId)}</span>
                  </div>
                  <div className="text-muted-foreground text-xs flex-shrink-0">
                    {format(new Date(res.date), "d MMM", { locale: tr })} • {res.time}
                  </div>
                </div>

                {/* Details Row: Guests, Source, Amount */}
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{res.quantity} Kişi</span>
                    <div className="flex items-center gap-1">
                      {getSourceIcon(res.source)}
                      <span className="text-xs">{getSourceLabel(res.source, res.notes)}</span>
                    </div>
                  </div>
                  <span className="font-medium">
                    {res.priceTl ? `₺${res.priceTl.toLocaleString('tr-TR')}` : ''}
                    {res.priceTl && res.priceUsd ? ' / ' : ''}
                    {res.priceUsd ? `$${res.priceUsd}` : ''}
                    {!res.priceTl && !res.priceUsd ? '-' : ''}
                  </span>
                </div>

                {/* Hotel/Transfer Row (if exists) */}
                {(res.hotelName || res.hasTransfer) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
                    {res.hasTransfer && <Bus className="h-3 w-3 text-blue-600" />}
                    {res.hotelName && (
                      <span className="flex items-center gap-1">
                        <Hotel className="h-3 w-3" />
                        {res.hotelName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Fragment>
        ))
      )}
    </div>
  );

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Mobile Card View */}
      <MobileCardView />
      
      {/* Desktop Table View */}
      <Table className="hidden md:table">
        <TableHeader className="bg-muted/50">
          <TableRow>
            {hasSelection && (
              <TableHead className="w-10">
                <Checkbox 
                  checked={selectedIds.size === reservations.length && reservations.length > 0}
                  onCheckedChange={onSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
            )}
            <TableHead>Sipariş No</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Aktivite & Tarih</TableHead>
            <TableHead>Otel / Transfer</TableHead>
            <TableHead>Kişi</TableHead>
            <TableHead>Kaynak</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">Tutar</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={hasSelection ? 10 : 9} className="h-24 text-center text-muted-foreground">
                Henüz rezervasyon bulunmuyor.
              </TableCell>
            </TableRow>
          ) : (
            groupedReservations.map((group, groupIdx) => (
              <Fragment key={group.type === 'group' ? group.groupKey : `single-${groupIdx}`}>
                {group.type === 'group' && (
                  <TableRow key={`header-${group.groupKey}`} className="bg-purple-50 dark:bg-purple-900/20 border-t-2 border-purple-300 dark:border-purple-600">
                    <TableCell colSpan={hasSelection ? 10 : 9} className="py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-medium text-purple-700 dark:text-purple-300">
                          {getPackageTourName(group.reservations[0].packageTourId)}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span className="font-medium">{group.reservations[0].customerName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.reservations.length} aktivite
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {group.reservations.map((res) => (
                  <TableRow 
                    key={res.id} 
                    className={`hover:bg-muted/50 ${onReservationSelect ? 'cursor-pointer' : ''} ${group.type === 'group' ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''} ${selectedIds?.has(res.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => onReservationSelect?.(res)}
                  >
                    {hasSelection && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.has(res.id)}
                          onCheckedChange={() => onToggleSelection(res.id)}
                          data-testid={`checkbox-reservation-${res.id}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {res.orderNumber ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          #{res.orderNumber}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{res.customerName}</div>
                          <div 
                            className="text-xs text-primary hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/messages?phone=${encodeURIComponent(res.customerPhone)}`;
                            }}
                          >
                            {res.customerPhone}
                          </div>
                        </div>
                        {hasDispatch(res) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-6 w-6 flex items-center justify-center">
                                <ArrowRightLeft className="h-4 w-4 text-blue-600" data-testid={`icon-dispatch-${res.id}`} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Gönderim mevcut</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getActivityName(res.activityId)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(res.date), "d MMMM yyyy", { locale: tr })} • {res.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      {res.hotelName ? (
                        <div className="flex items-center gap-2">
                          {res.hasTransfer && (
                            <span title="Transfer Istedi">
                              <Bus className="h-4 w-4 text-blue-600" />
                            </span>
                          )}
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <Hotel className="h-3 w-3 text-muted-foreground" />
                              <span>{res.hotelName}</span>
                            </div>
                          </div>
                        </div>
                      ) : res.hasTransfer ? (
                        <div className="flex items-center gap-1 text-blue-600" title="Transfer Istedi">
                          <Bus className="h-4 w-4" />
                          <span className="text-xs">Transfer</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>{res.quantity} Kişi</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSourceIcon(res.source)}
                        <span className={`text-sm ${res.source === 'partner' ? 'text-purple-600 dark:text-purple-400 font-medium' : ''}`}>
                          {getSourceLabel(res.source, res.notes)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>{getStatusBadge(res.status || 'pending', res.id)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {res.priceTl ? `₺${res.priceTl.toLocaleString('tr-TR')}` : ''}
                      {res.priceTl && res.priceUsd ? ' / ' : ''}
                      {res.priceUsd ? `$${res.priceUsd}` : ''}
                      {!res.priceTl && !res.priceUsd ? '-' : ''}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${res.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {res.status !== 'confirmed' && (
                            <DropdownMenuItem 
                              onClick={() => statusMutation.mutate({ id: res.id, status: 'confirmed' })}
                              data-testid={`action-confirm-${res.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Onayla
                            </DropdownMenuItem>
                          )}
                          {res.status !== 'cancelled' && (
                            <DropdownMenuItem 
                              onClick={() => statusMutation.mutate({ id: res.id, status: 'cancelled' })}
                              data-testid={`action-cancel-${res.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-2 text-red-600" />
                              İptal Et
                            </DropdownMenuItem>
                          )}
                          {onWhatsAppNotify && (
                            <DropdownMenuItem 
                              onClick={() => onWhatsAppNotify(res)}
                              data-testid={`action-whatsapp-${res.id}`}
                            >
                              <Send className="h-4 w-4 mr-2 text-green-600" />
                              Müşteriye Whatsapp Bildirimi
                            </DropdownMenuItem>
                          )}
                          {onAddDispatch && (
                            <DropdownMenuItem 
                              onClick={() => onAddDispatch(res)}
                              data-testid={`action-dispatch-${res.id}`}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-600" />
                              Partner Acentaya Gönder
                            </DropdownMenuItem>
                          )}
                          {onNotifyAgency && (
                            <DropdownMenuItem 
                              onClick={() => onNotifyAgency(res)}
                              data-testid={`action-notify-agency-${res.id}`}
                            >
                              <Phone className="h-4 w-4 mr-2 text-green-600" />
                              Acentaya Whatsapp Bildirimi
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {res.trackingToken ? (
                            <>
                              <DropdownMenuItem 
                                onClick={() => copyExistingLink(res.trackingToken!, res.id)}
                                data-testid={`copy-tracking-${res.id}`}
                              >
                                {copiedId === res.id ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2 text-green-600" />
                                    Kopyalandı
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Takip Linkini Kopyala
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  const trackingUrl = `${window.location.origin}/takip/${res.trackingToken}`;
                                  window.open(trackingUrl, '_blank');
                                }}
                                data-testid={`open-tracking-${res.id}`}
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                Takip Sayfasını Aç
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => trackingMutation.mutate(res.id)}
                              disabled={trackingMutation.isPending}
                              data-testid={`generate-tracking-${res.id}`}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Takip Linki Oluştur
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
