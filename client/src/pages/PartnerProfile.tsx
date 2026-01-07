import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Calendar, User, Clock, Users, MapPin, CheckCircle, XCircle, HourglassIcon } from "lucide-react";

interface ReservationRequest {
  id: number;
  activityId: number;
  activityName: string; // Enriched from backend
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
  activityName: string; // Enriched from backend
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  quantity: number;
  status: string | null;
  source: string | null;
}

export default function PartnerProfile() {
  const { data: myRequests, isLoading: requestsLoading } = useQuery<ReservationRequest[]>({
    queryKey: ["/api/my-reservation-requests"],
  });

  const { data: myReservations, isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/my-reservations"],
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

  const pendingCount = myRequests?.filter(r => r.status === "pending").length || 0;
  const approvedCount = myRequests?.filter(r => r.status === "approved" || r.status === "converted").length || 0;
  const rejectedCount = myRequests?.filter(r => r.status === "rejected").length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <User className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Is Ortagi Paneli</h1>
          <p className="text-muted-foreground">Rezervasyon talepleriniz ve durumlarini buradan takip edebilirsiniz</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Taleplerim
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-2">
            <Calendar className="w-4 h-4" />
            Rezervasyonlarim
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
      </Tabs>
    </div>
  );
}
