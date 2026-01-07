import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  Check, 
  X, 
  Clock, 
  Loader2, 
  ArrowRight,
  User,
  Phone,
  Calendar,
  Users,
  MessageSquare,
  Handshake
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Activity, AppUser } from "@shared/schema";

interface ReservationRequest {
  id: number;
  tenantId: number | null;
  activityId: number;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  guests: number | null;
  notes: string | null;
  status: string | null;
  requestedBy: number | null;
  processedBy: number | null;
  processedAt: string | null;
  processNotes: string | null;
  reservationId: number | null;
  createdAt: string | null;
}

export default function ReservationRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReservationRequest | null>(null);
  const [processAction, setProcessAction] = useState<"approve" | "reject" | null>(null);
  const [processNotes, setProcessNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ['/api/users'],
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest('PATCH', `/api/reservation-requests/${id}`, { status, processNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-requests'] });
      toast({ title: "Basarili", description: "Talep durumu guncellendi." });
      setProcessDialogOpen(false);
      setSelectedRequest(null);
      setProcessNotes("");
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep guncellenemedi.", variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/reservation-requests/${id}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: "Basarili", description: "Talep rezervasyona donusturuldu." });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Donusturulemedi.", variant: "destructive" });
    },
  });

  const getActivityName = (activityId: number) => {
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };

  const getRequesterName = (requestedBy: number | null) => {
    if (!requestedBy) return "Bilinmiyor";
    const user = users.find(u => u.id === requestedBy);
    return user?.name || user?.username || "Bilinmiyor";
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Beklemede</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Onaylandi</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Reddedildi</Badge>;
      case "converted":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Rezervasyona Donusturuldu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openProcessDialog = (request: ReservationRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setProcessAction(action);
    setProcessNotes("");
    setProcessDialogOpen(true);
  };

  const handleProcess = () => {
    if (!selectedRequest || !processAction) return;
    
    processMutation.mutate({
      id: selectedRequest.id,
      status: processAction === "approve" ? "approved" : "rejected",
      notes: processNotes || undefined,
    });
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const approvedRequests = requests.filter(r => r.status === "approved");
  const otherRequests = requests.filter(r => r.status !== "pending" && r.status !== "approved");

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Rezervasyon Talepleri</h1>
            <p className="text-muted-foreground text-sm">
              Is ortaklarindan gelen rezervasyon taleplerini yonetin.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henuz rezervasyon talebi bulunmuyor.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {pendingRequests.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Bekleyen Talepler ({pendingRequests.length})
                  </h2>
                  <div className="grid gap-4">
                    {pendingRequests.map((request) => (
                      <Card key={request.id} className="border-yellow-200 dark:border-yellow-800">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.customerName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })} - {request.time}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.guests || 1} kisi</span>
                                </div>
                              </div>
                              {request.notes && (
                                <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                  <MessageSquare className="h-4 w-4 mt-0.5" />
                                  <span>{request.notes}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Handshake className="h-3.5 w-3.5" />
                                <span>Is Ortagi: {getRequesterName(request.requestedBy)}</span>
                                {request.createdAt && (
                                  <span className="ml-2">({format(new Date(request.createdAt), "d MMM yyyy HH:mm", { locale: tr })})</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => openProcessDialog(request, "reject")}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reddet
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => openProcessDialog(request, "approve")}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Onayla
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {approvedRequests.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Onaylanan Talepler ({approvedRequests.length})
                  </h2>
                  <div className="grid gap-4">
                    {approvedRequests.map((request) => (
                      <Card key={request.id} className="border-green-200 dark:border-green-800">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.customerName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })} - {request.time}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.guests || 1} kisi</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Handshake className="h-3.5 w-3.5" />
                                <span>Is Ortagi: {getRequesterName(request.requestedBy)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => convertMutation.mutate(request.id)}
                                disabled={convertMutation.isPending}
                                data-testid={`button-convert-${request.id}`}
                              >
                                {convertMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                )}
                                Rezervasyona Donustur
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {otherRequests.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Diger Talepler ({otherRequests.length})</h2>
                  <div className="grid gap-4">
                    {otherRequests.map((request) => (
                      <Card key={request.id} className="opacity-70">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{getActivityName(request.activityId)}</Badge>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{request.customerName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{format(new Date(request.date), "d MMM yyyy", { locale: tr })} - {request.time}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Handshake className="h-3.5 w-3.5" />
                                <span>Is Ortagi: {getRequesterName(request.requestedBy)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processAction === "approve" ? "Talebi Onayla" : "Talebi Reddet"}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <div><strong>Musteri:</strong> {selectedRequest.customerName}</div>
                <div><strong>Aktivite:</strong> {getActivityName(selectedRequest.activityId)}</div>
                <div><strong>Tarih:</strong> {format(new Date(selectedRequest.date), "d MMMM yyyy", { locale: tr })} - {selectedRequest.time}</div>
                <div><strong>Kisi:</strong> {selectedRequest.guests || 1}</div>
              </div>
              <div className="space-y-2">
                <Label>Not (Opsiyonel)</Label>
                <Textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  placeholder={processAction === "approve" ? "Onay notu..." : "Red sebebi..."}
                  data-testid="textarea-process-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
              Iptal
            </Button>
            <Button
              onClick={handleProcess}
              disabled={processMutation.isPending}
              className={processAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              data-testid="button-confirm-process"
            >
              {processMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {processAction === "approve" ? "Onayla" : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
