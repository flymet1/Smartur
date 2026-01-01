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
import { MessageSquare, Globe, User, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ReservationTableProps {
  reservations: Reservation[];
}

export function ReservationTable({ reservations }: ReservationTableProps) {
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  const { data: packageTours = [] } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });

  const getActivityName = (activityId: number | null) => {
    if (!activityId) return "Bilinmiyor";
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };

  const getPackageTourName = (packageTourId: number | null) => {
    if (!packageTourId) return null;
    return packageTours.find(p => p.id === packageTourId)?.name || null;
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Onaylı</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Beklemede</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">İptal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Henüz rezervasyon bulunmuyor.
              </TableCell>
            </TableRow>
          ) : (
            reservations.map((res) => (
              <TableRow key={res.id} className="hover:bg-muted/50">
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
                <TableCell>{getStatusBadge(res.status || 'pending')}</TableCell>
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
