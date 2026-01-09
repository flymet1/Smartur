import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface InAppNotification {
  id: number;
  tenantId: number;
  userId: number | null;
  title: string;
  message: string;
  notificationType: string;
  relatedId: number | null;
  isRead: boolean;
  createdAt: string;
}

interface ReservationRequest {
  id: number;
  status: string;
  notes: string | null;
}

interface ChangeRequest {
  id: number;
  status: string;
  initiatedByType: string;
}

export function GlobalNotifications() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const notificationsShownRef = useRef<Set<number>>(new Set());
  const partnerNotificationShownRef = useRef(false);
  const previousPartnerCountRef = useRef<number | null>(null);

  const { data: inAppNotifications = [] } = useQuery<InAppNotification[]>({
    queryKey: ['/api/in-app-notifications'],
    refetchInterval: 15000,
  });

  const { data: reservationRequests = [] } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 15000,
  });

  const { data: changeRequests = [] } = useQuery<ChangeRequest[]>({
    queryKey: ['/api/reservation-change-requests'],
    refetchInterval: 15000,
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('PATCH', `/api/in-app-notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/in-app-notifications'] });
    },
  });

  const getNotificationRoute = (type: string): string => {
    switch (type) {
      case 'support_request':
        return '/support';
      case 'change_request':
        return '/reservations';
      case 'new_reservation':
        return '/reservations';
      case 'viewer_request':
        return '/viewer-stats';
      case 'partner_request':
        return '/partner-availability';
      case 'customer_request':
        return '/customer-requests';
      default:
        return '/dashboard';
    }
  };

  const getInitiatorTypeFromNotes = (notes: string | null): 'viewer' | 'partner' | 'unknown' => {
    if (!notes) return 'unknown';
    if (notes.includes('[Viewer:') || notes.includes('[İzleyici:')) return 'viewer';
    if (notes.includes('[Partner:')) return 'partner';
    return 'unknown';
  };

  const pendingReservationRequests = reservationRequests.filter(r => r.status === 'pending');
  const partnerReservationRequests = pendingReservationRequests.filter(r => {
    const type = getInitiatorTypeFromNotes(r.notes);
    return type === 'partner' || type === 'unknown';
  });
  const partnerChangeRequests = changeRequests.filter(r => r.status === 'pending' && r.initiatedByType === 'partner');
  const totalPartnerRequests = partnerReservationRequests.length + partnerChangeRequests.length;

  useEffect(() => {
    if (previousPartnerCountRef.current === null) {
      previousPartnerCountRef.current = totalPartnerRequests;
      if (totalPartnerRequests > 0 && !partnerNotificationShownRef.current) {
        partnerNotificationShownRef.current = true;
        toast({
          title: `${totalPartnerRequests} bekleyen partner talebi var`,
          description: "Partner Müsaitlik sayfasından inceleyin.",
          variant: "default",
          action: (
            <ToastAction altText="Görüntüle" onClick={() => navigate('/partner-availability')}>
              Görüntüle
            </ToastAction>
          ),
        });
      }
    } else if (totalPartnerRequests > previousPartnerCountRef.current) {
      const newCount = totalPartnerRequests - previousPartnerCountRef.current;
      toast({
        title: `${newCount} yeni partner talebi geldi`,
        description: "Partner Müsaitlik sayfasından inceleyin.",
        variant: "default",
        action: (
          <ToastAction altText="Görüntüle" onClick={() => navigate('/partner-availability')}>
            Görüntüle
          </ToastAction>
        ),
      });
      previousPartnerCountRef.current = totalPartnerRequests;
    } else {
      previousPartnerCountRef.current = totalPartnerRequests;
    }
  }, [totalPartnerRequests, toast, navigate]);

  useEffect(() => {
    const unreadNotifications = inAppNotifications.filter(n => !n.isRead);
    const timeoutIds: NodeJS.Timeout[] = [];
    
    unreadNotifications.slice(0, 5).forEach((notification, index) => {
      if (notificationsShownRef.current.has(notification.id)) return;
      notificationsShownRef.current.add(notification.id);
      
      const timeoutId = setTimeout(() => {
        const getNotificationVariant = (type: string): "default" | "destructive" => {
          switch (type) {
            case 'support_request':
            case 'change_request':
              return 'destructive';
            default:
              return 'default';
          }
        };

        const route = getNotificationRoute(notification.notificationType);

        toast({
          title: notification.title,
          description: notification.message,
          variant: getNotificationVariant(notification.notificationType),
          action: (
            <ToastAction altText="Görüntüle" onClick={() => navigate(route)}>
              Görüntüle
            </ToastAction>
          ),
        });

        markNotificationRead.mutate(notification.id);
      }, index * 1500);
      
      timeoutIds.push(timeoutId);
    });

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [inAppNotifications, navigate, toast]);

  return null;
}
