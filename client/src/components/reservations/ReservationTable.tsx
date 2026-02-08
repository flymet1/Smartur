import { Fragment, useState, useMemo, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Reservation, Activity, PackageTour } from "@shared/schema";
import { MessageSquare, Globe, User, Package, ChevronDown, ChevronRight, Link2, Copy, Check, MoreHorizontal, Bus, Hotel, Star, StickyNote, Handshake, Send, CheckCircle, XCircle, ArrowRightLeft, Phone, Pencil, Save, MessageCircle } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReservationMetadata {
  participants?: Array<{ firstName: string; lastName: string; birthDate: string }>;
  extras?: Array<{ name: string; quantity: number; priceTl: number }>;
  totalPrice?: number;
  depositRequired?: number;
  remainingPayment?: number;
  paymentType?: string;
}

function parseReservationMetadata(notes: string | null | undefined): ReservationMetadata | null {
  if (!notes) return null;
  const match = notes.match(/__METADATA__:(.*)/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function getNotesWithoutMetadata(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.replace(/__METADATA__:.*$/, "").trim();
}

interface PartnerDispatchStatus {
  reservationRequestId: number;
  sourceReservationId: number;
  status: string;
  partnerTenantName: string;
  activityId: number;
  date: string;
  time: string;
  customerName: string;
  guests: number;
  processNotes: string | null;
  createdAt: string;
}

interface ReservationTableProps {
  reservations: Reservation[];
  onReservationSelect?: (reservation: Reservation) => void;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
  onSelectAll?: () => void;
  onWhatsAppNotify?: (reservation: Reservation) => void;
  onAddDispatch?: (reservation: Reservation) => void;
  onNotifyAgency?: (reservation: Reservation) => void;
  onMoveSuccess?: (reservation: Reservation, oldDate: string, newDate: string, oldTime?: string, newTime?: string) => void;
  partnerDispatchStatuses?: PartnerDispatchStatus[];
}

export function ReservationTable({ 
  reservations, 
  onReservationSelect, 
  selectedIds, 
  onToggleSelection, 
  onSelectAll,
  onWhatsAppNotify,
  onAddDispatch,
  onNotifyAgency,
  onMoveSuccess,
  partnerDispatchStatuses
}: ReservationTableProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPriceTl, setEditPriceTl] = useState("");
  const [editPriceUsd, setEditPriceUsd] = useState("");
  const [editAdvancePayment, setEditAdvancePayment] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
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

  const reservationUpdateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; date?: string; time?: string; priceTl?: number; priceUsd?: number; salePriceTl?: number; advancePaymentTl?: number; notes?: string }) => {
      return apiRequest('PATCH', `/api/reservations/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: "Basarili", description: "Rezervasyon guncellendi." });
      setIsEditing(false);
      setIsEditingNotes(false);
      const res = reservations.find(r => r.id === variables.id);
      if (res && onMoveSuccess && variables.date && variables.time && (variables.date !== res.date || variables.time !== res.time)) {
        onMoveSuccess(res, res.date, variables.date, res.time, variables.time);
      }
    },
    onError: () => {
      toast({ title: "Hata", description: "Guncelleme basarisiz.", variant: "destructive" });
    },
  });

  const toggleExpand = (res: Reservation) => {
    if (expandedId === res.id) {
      setExpandedId(null);
      setIsEditing(false);
      setIsEditingNotes(false);
    } else {
      setExpandedId(res.id);
      setEditDate(res.date);
      setEditTime(res.time);
      setEditPriceTl(String(res.priceTl || 0));
      setEditPriceUsd(String(res.priceUsd || 0));
      setEditAdvancePayment(String((res as any).advancePaymentTl || 0));
      const cleanNotes = getNotesWithoutMetadata(res.notes);
      setEditNotes(cleanNotes || "");
      setIsEditing(false);
      setIsEditingNotes(false);
    }
  };

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

  const getDispatchStatusBadges = (reservationId: number) => {
    if (!partnerDispatchStatuses) return null;
    const dispatches = partnerDispatchStatuses.filter(d => d.sourceReservationId === reservationId);
    if (dispatches.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {dispatches.map((d) => {
          const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
            pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Handshake className="h-3 w-3 mr-1" /> },
            approved: { label: "Onaylandi", className: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
            rejected: { label: "Reddedildi", className: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3 mr-1" /> },
            converted: { label: "Onaylandi", className: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
          };
          const config = statusConfig[d.status || 'pending'] || statusConfig.pending;
          return (
            <span
              key={d.reservationRequestId}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.className}`}
              title={`${d.partnerTenantName} - ${d.date} ${d.time} - ${d.guests} kisi${d.processNotes ? ` - ${d.processNotes}` : ''}`}
              data-testid={`dispatch-status-${d.reservationRequestId}`}
            >
              {config.icon}
              {d.partnerTenantName}: {config.label}
            </span>
          );
        })}
      </div>
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

  const renderExpandedDetail = (res: Reservation) => {
    const activity = activities.find(a => a.id === res.activityId);
    const metadata = parseReservationMetadata(res.notes);
    const cleanNotes = getNotesWithoutMetadata(res.notes);
    const statusConfig: Record<string, { label: string; className: string }> = {
      confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700" },
      pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700" },
      cancelled: { label: "İptal", className: "bg-red-100 text-red-700" },
    };
    const status = statusConfig[res.status || 'pending'] || { label: res.status, className: "" };
    const availableTimes = activity ? (() => {
      try { return JSON.parse((activity as any).defaultTimes || "[]"); } catch { return []; }
    })() : [];

    const handleSaveDatetime = () => {
      if (!editDate || !editTime) {
        toast({ title: "Hata", description: "Tarih ve saat seçiniz.", variant: "destructive" });
        return;
      }
      const updates: { id: number; date?: string; time?: string; priceTl?: number; priceUsd?: number; salePriceTl?: number; advancePaymentTl?: number } = { id: res.id, date: editDate, time: editTime };
      const newPriceTl = parseFloat(editPriceTl);
      const newPriceUsd = parseFloat(editPriceUsd);
      const newAdvance = parseFloat(editAdvancePayment);
      if (!isNaN(newPriceTl)) { updates.priceTl = newPriceTl; updates.salePriceTl = newPriceTl; }
      if (!isNaN(newPriceUsd)) updates.priceUsd = newPriceUsd;
      if (!isNaN(newAdvance)) updates.advancePaymentTl = newAdvance;
      reservationUpdateMutation.mutate(updates);
    };

    const handleSaveNotes = () => {
      const metadataStr = res.notes ? (() => {
        const match = res.notes.match(/__METADATA__:.*$/);
        return match ? match[0] : "";
      })() : "";
      const fullNotes = editNotes ? (metadataStr ? `${editNotes}\n${metadataStr}` : editNotes) : metadataStr || "";
      reservationUpdateMutation.mutate({ id: res.id, notes: fullNotes });
    };

    const handleCancelEdit = () => {
      setEditDate(res.date);
      setEditTime(res.time);
      setEditPriceTl(String(res.priceTl || 0));
      setEditPriceUsd(String(res.priceUsd || 0));
      setEditAdvancePayment(String((res as any).advancePaymentTl || 0));
      setIsEditing(false);
    };

    const handleCancelNotesEdit = () => {
      setEditNotes(cleanNotes || "");
      setIsEditingNotes(false);
    };

    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-muted-foreground text-xs">Müşteri</Label>
            <div 
              className="font-medium text-primary hover:underline cursor-pointer" 
              data-testid="text-customer-name"
              onClick={() => { window.location.href = `/customers?phone=${encodeURIComponent(res.customerPhone)}`; }}
            >{res.customerName}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Telefon</Label>
            <div 
              className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1" 
              data-testid="text-customer-phone"
              onClick={() => { window.location.href = `/messages?phone=${encodeURIComponent(res.customerPhone)}`; }}
            >
              <MessageCircle className="h-3 w-3" />
              {res.customerPhone}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">E-posta</Label>
            <div className="font-medium" data-testid="text-customer-email">{res.customerEmail || "-"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Kişi Sayısı</Label>
            <div className="font-medium" data-testid="text-quantity">{res.quantity} kişi</div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-muted-foreground text-xs">Aktivite</Label>
            <div className="font-medium" data-testid="text-activity">{activity?.name || "Bilinmiyor"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Kaynak</Label>
            <div className="font-medium">
              {res.source === 'manual' ? 'Manuel' : 
               res.source === 'woocommerce' ? 'WooCommerce' : 
               res.source === 'partner' ? (() => {
                 const partnerMatch = (res as any).notes?.match(/\[Partner:\s*([^\]]+)\]/);
                 return partnerMatch ? `Partner: ${partnerMatch[1]}` : 'Partner Acenta';
               })() : 
               res.source}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Odeme Durumu</Label>
            <Badge 
              variant={
                (res as any).paymentStatus === 'paid' ? 'default' : 
                (res as any).paymentStatus === 'partial' ? 'secondary' : 
                'outline'
              }
              className={
                (res as any).paymentStatus === 'paid' ? 'bg-green-600 text-white' : 
                (res as any).paymentStatus === 'partial' ? 'bg-yellow-500 text-white' : 
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }
              data-testid="badge-payment-status"
            >
              {(res as any).paymentStatus === 'paid' ? 'Odendi' : 
               (res as any).paymentStatus === 'partial' ? 'Kismi' : 
               'Odenmedi'}
            </Badge>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Durum</Label>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              Tarih
              {!isEditing && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-datetime"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </Label>
            {isEditing ? (
              <Input 
                type="date" 
                value={editDate} 
                onChange={(e) => setEditDate(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-edit-date"
              />
            ) : (
              <div className="font-medium" data-testid="text-date">{res.date}</div>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              Saat
              {!isEditing && (
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setIsEditing(true)} data-testid="button-edit-time">
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </Label>
            {isEditing ? (
              availableTimes.length > 0 ? (
                <Select value={editTime} onValueChange={setEditTime}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-edit-time">
                    <SelectValue placeholder="Saat seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((t: string) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  type="time" 
                  value={editTime} 
                  onChange={(e) => setEditTime(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-edit-time"
                />
              )
            ) : (
              <div className="font-medium" data-testid="text-time">{res.time}</div>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              Fiyat (TL)
              {!isEditing && (
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setIsEditing(true)} data-testid="button-edit-price-tl">
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </Label>
            {isEditing ? (
              <Input 
                type="number" 
                value={editPriceTl} 
                onChange={(e) => setEditPriceTl(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-edit-price-tl"
              />
            ) : (
              <div className="font-medium" data-testid="text-price-tl">
                {(res.priceTl ?? 0) > 0 ? `${(res.priceTl ?? 0).toLocaleString('tr-TR')} ₺` : '-'}
              </div>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              Fiyat (USD)
              {!isEditing && (
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setIsEditing(true)} data-testid="button-edit-price-usd">
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </Label>
            {isEditing ? (
              <Input 
                type="number" 
                value={editPriceUsd} 
                onChange={(e) => setEditPriceUsd(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-edit-price-usd"
              />
            ) : (
              <div className="font-medium" data-testid="text-price-usd">
                {(res.priceUsd ?? 0) > 0 ? `$${res.priceUsd}` : '-'}
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">On Odeme (Kapora) ₺</Label>
              <Input 
                type="number" 
                value={editAdvancePayment} 
                onChange={(e) => setEditAdvancePayment(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-edit-advance-payment"
              />
            </div>
          </div>
        )}

        {!isEditing && (res as any).advancePaymentTl > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                On Odeme (Kapora)
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setIsEditing(true)} data-testid="button-edit-advance">
                  <Pencil className="h-3 w-3" />
                </Button>
              </Label>
              <div className="font-medium text-amber-600" data-testid="text-advance-payment">
                {((res as any).advancePaymentTl || 0).toLocaleString('tr-TR')} ₺
              </div>
            </div>
            {((res as any).salePriceTl ?? res.priceTl ?? 0) > 0 && (
              <div>
                <Label className="text-muted-foreground text-xs">Kalan Odeme</Label>
                <div className="font-medium" data-testid="text-remaining-payment">
                  {(((res as any).salePriceTl ?? res.priceTl ?? 0) - ((res as any).advancePaymentTl || 0)).toLocaleString('tr-TR')} ₺
                </div>
              </div>
            )}
          </div>
        )}

        {isEditing && (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleSaveDatetime}
              disabled={reservationUpdateMutation.isPending}
              data-testid="button-save-datetime"
            >
              <Save className="h-4 w-4 mr-1" />
              Kaydet
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancelEdit}
              disabled={reservationUpdateMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Vazgec
            </Button>
          </div>
        )}

        {res.orderNumber && (
          <>
            <Separator />
            <div>
              <Label className="text-muted-foreground text-xs">Sipariş No</Label>
              <div className="font-medium">{res.orderNumber}</div>
            </div>
          </>
        )}

        {(res.hotelName || res.hasTransfer) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {res.hotelName && (
                <div>
                  <Label className="text-muted-foreground text-xs">Otel</Label>
                  <div className="font-medium">{res.hotelName}</div>
                </div>
              )}
              {res.hasTransfer && (
                <div>
                  <Label className="text-muted-foreground text-xs">Transfer Bölgesi</Label>
                  <div className="font-medium">{(res as any).transferZone || "Belirtilmedi"}</div>
                </div>
              )}
            </div>
            {res.hasTransfer && (
              <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Otel transferi talep edildi
              </div>
            )}
          </>
        )}

        {(() => {
          let dbExtras: Array<{ name: string; quantity?: number; priceTl: number }> = [];
          try {
            const parsed = JSON.parse((res as any).selectedExtras || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) dbExtras = parsed;
          } catch {}
          const metaExtras = metadata?.extras || [];
          const extras = dbExtras.length > 0 ? dbExtras : metaExtras;
          if (extras.length === 0) return null;
          return (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-xs">Ekstralar</Label>
                <div className="space-y-1 mt-1">
                  {extras.map((extra, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{extra.name}{(extra.quantity ?? 1) > 1 ? ` x${extra.quantity}` : ''}</span>
                      <span className="font-medium">{(extra.priceTl * (extra.quantity ?? 1)).toLocaleString('tr-TR')} ₺</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        {(() => {
          const salePrice = (res as any).salePriceTl || res.priceTl || 0;
          const advance = (res as any).advancePaymentTl || 0;
          const remaining = salePrice > 0 ? salePrice - advance : 0;
          const metaTotal = metadata?.totalPrice ?? 0;
          const metaDeposit = metadata?.depositRequired ?? 0;
          const metaRemaining = metadata?.remainingPayment ?? 0;
          const totalToShow = salePrice > 0 ? salePrice : metaTotal;
          const depositToShow = advance > 0 ? advance : metaDeposit;
          const remainingToShow = remaining > 0 ? remaining : metaRemaining;
          if (totalToShow <= 0 && depositToShow <= 0) return null;
          return (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Odeme Bilgileri</Label>
                {totalToShow > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Toplam Tutar</span>
                    <span className="font-bold text-primary" data-testid="text-total-price">{totalToShow.toLocaleString('tr-TR')} ₺</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>On Odeme (Kapora)</span>
                  <span className="font-medium text-amber-600" data-testid="text-deposit-info">
                    {depositToShow > 0 ? `${depositToShow.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Kalan Odeme</span>
                  <span className={`font-medium ${remainingToShow > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} data-testid="text-remaining-info">
                    {remainingToShow > 0 ? `${remainingToShow.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                  </span>
                </div>
                {metadata?.paymentType && (
                  <div className="text-xs text-muted-foreground">
                    {metadata.paymentType === 'full' ? 'Tam odeme gerekli' : 
                     metadata.paymentType === 'deposit' ? 'On odeme gerekli, kalan aktivite gunu alinacak' : 
                     'Odeme aktivite gunu alinacak'}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {metadata?.participants && metadata.participants.length > 0 && (
          <>
            <Separator />
            <div>
              <Label className="text-muted-foreground text-xs">Katılımcılar ({metadata.participants.length} kişi)</Label>
              <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                {metadata.participants.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-sm bg-muted/50 px-2 py-1 rounded-md">
                    <span>{p.firstName} {p.lastName}</span>
                    <span className="text-muted-foreground text-xs">{p.birthDate}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />
        <div>
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            Notlar
            {!isEditingNotes && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setIsEditingNotes(true)}
                data-testid="button-edit-notes"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </Label>
          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea 
                value={editNotes} 
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Not ekleyin..."
                data-testid="textarea-edit-notes"
              />
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSaveNotes}
                  disabled={reservationUpdateMutation.isPending}
                  data-testid="button-save-notes"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Kaydet
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelNotesEdit}
                  disabled={reservationUpdateMutation.isPending}
                  data-testid="button-cancel-notes"
                >
                  Vazgec
                </Button>
              </div>
            </div>
          ) : (
            <div className="font-medium text-sm whitespace-pre-wrap" data-testid="text-notes">
              {cleanNotes || <span className="text-muted-foreground italic">Not yok - kalem ikonuna tiklayarak ekleyebilirsiniz</span>}
            </div>
          )}
        </div>

        {res.source === 'manual' && (res as any).createdByUserName && (
          <>
            <Separator />
            <div>
              <Label className="text-muted-foreground text-xs">Oluşturan Kullanıcı</Label>
              <div className="font-medium flex items-center gap-2" data-testid="text-created-by-user">
                <User className="h-4 w-4 text-muted-foreground" />
                {(res as any).createdByUserName}
              </div>
            </div>
          </>
        )}

        {res.trackingToken && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const link = `${window.location.origin}/takip/${res.trackingToken}`;
                  navigator.clipboard.writeText(link);
                  toast({ title: "Kopyalandı", description: "Takip linki panoya kopyalandı." });
                }}
                data-testid="button-copy-tracking"
              >
                <Copy className="h-4 w-4 mr-1" />
                Takip Linki Kopyala
              </Button>
            </div>
          </>
        )}
      </div>
    );
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
                className={`rounded-lg border p-3 space-y-2 ${group.type === 'group' ? 'border-purple-200 dark:border-purple-800 ml-2' : ''} ${selectedIds?.has(res.id) ? 'bg-primary/5 border-primary' : 'bg-card'}`}
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
                      <div 
                        className="font-medium truncate text-primary hover:underline cursor-pointer" 
                        data-testid={`text-customer-name-mobile-${res.id}`}
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/customers?phone=${encodeURIComponent(res.customerPhone)}`; }}
                      >{res.customerName}</div>
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
                  <div className="flex flex-col items-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
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
                            Acentaya Gönder
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
                    {getDispatchStatusBadges(res.id)}
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

                <div className="pt-1 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-center gap-1 text-xs text-muted-foreground"
                    onClick={() => toggleExpand(res)}
                    data-testid={`button-expand-mobile-${res.id}`}
                  >
                    {expandedId === res.id ? (
                      <><ChevronDown className="h-3 w-3" /> Detayları Gizle</>
                    ) : (
                      <><ChevronRight className="h-3 w-3" /> Detayları Göster</>
                    )}
                  </Button>
                  {expandedId === res.id && (
                    <div className="mt-2 border-t pt-2">
                      {renderExpandedDetail(res)}
                    </div>
                  )}
                </div>
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
            <TableHead className="w-20"></TableHead>
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
                        <span 
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/customers?phone=${encodeURIComponent(group.reservations[0].customerPhone)}`; }}
                        >{group.reservations[0].customerName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.reservations.length} aktivite
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {group.reservations.map((res) => (
                  <Fragment key={res.id}>
                  <TableRow 
                    className={`hover:bg-muted/50 ${group.type === 'group' ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''} ${selectedIds?.has(res.id) ? 'bg-primary/5' : ''}`}
                  >
                    {hasSelection && (
                      <TableCell>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div 
                            className="font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => { window.location.href = `/customers?phone=${encodeURIComponent(res.customerPhone)}`; }}
                          >{res.customerName}</div>
                          <div 
                            className="text-xs text-primary hover:underline cursor-pointer"
                            onClick={() => {
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
                    <TableCell>
                      {getStatusBadge(res.status || 'pending', res.id)}
                      {getDispatchStatusBadges(res.id)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {res.priceTl ? `₺${res.priceTl.toLocaleString('tr-TR')}` : ''}
                      {res.priceTl && res.priceUsd ? ' / ' : ''}
                      {res.priceUsd ? `$${res.priceUsd}` : ''}
                      {!res.priceTl && !res.priceUsd ? '-' : ''}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
                                Acentaya Gönder
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleExpand(res)}
                          data-testid={`button-expand-${res.id}`}
                        >
                          {expandedId === res.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === res.id && (
                    <TableRow>
                      <TableCell colSpan={hasSelection ? 11 : 10} className="bg-muted/30 p-0">
                        {renderExpandedDetail(res)}
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                ))}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
