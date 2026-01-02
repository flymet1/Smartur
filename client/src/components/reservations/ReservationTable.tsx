import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Reservation, Activity, PackageTour } from "@shared/schema";
import { MessageSquare, Globe, User, Package, ChevronDown } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ReservationTableProps {
  reservations: Reservation[];
}

export function ReservationTable({ reservations }: ReservationTableProps) {
  const { toast } = useToast();
  
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
      toast({ title: "Başarılı", description: "Rezervasyon durumu güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
    },
  });

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

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Sipariş No</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Aktivite & Tarih</TableHead>
            <TableHead>Kişi</TableHead>
            <TableHead>Kaynak</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">Tutar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Henüz rezervasyon bulunmuyor.
              </TableCell>
            </TableRow>
          ) : (
            reservations.map((res) => (
              <TableRow key={res.id} className="hover:bg-muted/50">
                <TableCell>
                  {res.orderNumber ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      #{res.orderNumber}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{res.customerName}</div>
                  <div className="text-xs text-muted-foreground">{res.customerPhone}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getActivityName(res.activityId)}</span>
                    {res.packageTourId && (
                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-900/20 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {getPackageTourName(res.packageTourId) || 'Paket'}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(res.date), "d MMMM yyyy", { locale: tr })} • {res.time}
                  </div>
                </TableCell>
                <TableCell>{res.quantity} Kişi</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(res.source)}
                    <span className="capitalize text-sm">{res.source || 'Manuel'}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(res.status || 'pending', res.id)}</TableCell>
                <TableCell className="text-right font-medium">
                  ₺{(res.quantity * 1500).toLocaleString('tr-TR')} {/* Mock price logic */}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
