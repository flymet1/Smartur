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
import { MessageSquare, Globe, User, Package, ChevronDown, Link2, Copy, Check, MoreHorizontal, Bus, Hotel, Star, History, StickyNote } from "lucide-react";
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
  onCustomerClick?: (phone: string, name: string) => void;
}

export function ReservationTable({ 
  reservations, 
  onReservationSelect, 
  selectedIds, 
  onToggleSelection, 
  onSelectAll,
  onCustomerClick 
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
      default:
        return <User className="h-4 w-4 text-gray-600" />;
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

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
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
              <>
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
                          <div className="text-xs text-muted-foreground">{res.customerPhone}</div>
                        </div>
                        {onCustomerClick && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => onCustomerClick(res.customerPhone, res.customerName)}
                                data-testid={`button-customer-history-${res.id}`}
                              >
                                <History className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Müşteri Geçmişi</TooltipContent>
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
                        <span className="capitalize text-sm">{res.source || 'Manuel'}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>{getStatusBadge(res.status || 'pending', res.id)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₺{(res.quantity * 1500).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${res.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
              </>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
