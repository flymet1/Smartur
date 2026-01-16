import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Hook to detect mobile viewport (matches xl: breakpoint at 1280px)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1280);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

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

interface CustomerRequest {
  id: number;
  status: string;
}

interface SessionData {
  authenticated: boolean;
  user?: { id: number; tenantId: number };
}

interface PartnerTransaction {
  id: number;
  deletionStatus: string | null;
  deletionRequestedByTenantId: number | null;
  currentTenantId: number;
}

export function GlobalNotifications() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const notificationsShownRef = useRef<Set<number>>(new Set());
  const isMobile = useIsMobile(); // Disable auto-popups on mobile
  
  const previousPartnerCountRef = useRef<number | null>(null);
  const previousViewerCountRef = useRef<number | null>(null);
  const previousCustomerCountRef = useRef<number | null>(null);
  const previousSupportCountRef = useRef<number | null>(null);
  const previousDeletionRequestCountRef = useRef<number | null>(null);
  const previousUserIdRef = useRef<number | null>(null);

  const { data: session } = useQuery<SessionData>({
    queryKey: ['/api/auth/session'],
    refetchInterval: 15000,
  });

  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;
    if (previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      previousPartnerCountRef.current = null;
      previousViewerCountRef.current = null;
      previousCustomerCountRef.current = null;
      previousSupportCountRef.current = null;
      previousDeletionRequestCountRef.current = null;
      notificationsShownRef.current = new Set();
    }
    previousUserIdRef.current = currentUserId;
  }, [session?.user?.id]);

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

  const { data: customerRequests = [] } = useQuery<CustomerRequest[]>({
    queryKey: ['/api/customer-requests'],
    refetchInterval: 15000,
  });

  const { data: supportSummary } = useQuery<{ openCount: number }>({
    queryKey: ['/api/support-requests/summary'],
    refetchInterval: 15000,
  });

  const { data: partnerTransactions = [] } = useQuery<PartnerTransaction[]>({
    queryKey: ['/api/partner-transactions'],
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
        return '/messages?filter=human_intervention';
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
      case 'partner_deletion_request':
        return '/finance';
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
  
  const viewerReservationRequests = pendingReservationRequests.filter(r => getInitiatorTypeFromNotes(r.notes) === 'viewer');
  const viewerChangeRequests = changeRequests.filter(r => r.status === 'pending' && r.initiatedByType === 'viewer');
  const totalViewerRequests = viewerReservationRequests.length + viewerChangeRequests.length;

  const partnerReservationRequests = pendingReservationRequests.filter(r => {
    const type = getInitiatorTypeFromNotes(r.notes);
    return type === 'partner' || type === 'unknown';
  });
  const partnerChangeRequests = changeRequests.filter(r => r.status === 'pending' && r.initiatedByType === 'partner');
  const totalPartnerRequests = partnerReservationRequests.length + partnerChangeRequests.length;

  const pendingCustomerRequests = customerRequests.filter(r => r.status === 'pending');
  const customerChangeRequests = changeRequests.filter(r => r.status === 'pending' && r.initiatedByType === 'customer');
  const totalCustomerRequests = pendingCustomerRequests.length + customerChangeRequests.length;

  const openSupportRequests = supportSummary?.openCount || 0;

  // Partner transaction deletion requests awaiting my approval (not requested by me)
  const pendingDeletionRequests = partnerTransactions.filter(tx => 
    tx.deletionStatus === 'pending' && 
    tx.deletionRequestedByTenantId !== tx.currentTenantId
  ).length;

  const showRequestNotification = (
    count: number,
    previousRef: React.MutableRefObject<number | null>,
    title: string,
    newTitle: string,
    description: string,
    route: string,
    variant: "default" | "destructive" = "default"
  ) => {
    // Skip toast notifications on mobile - users can use the notification bell instead
    if (isMobile) {
      previousRef.current = count;
      return;
    }
    
    if (previousRef.current === null) {
      previousRef.current = count;
      if (count > 0) {
        toast({
          title: title.replace('{count}', count.toString()),
          description,
          variant,
          action: (
            <ToastAction altText="Görüntüle" onClick={() => navigate(route)}>
              Görüntüle
            </ToastAction>
          ),
        });
      }
    } else if (count > previousRef.current) {
      const newCount = count - previousRef.current;
      toast({
        title: newTitle.replace('{count}', newCount.toString()),
        description,
        variant,
        action: (
          <ToastAction altText="Görüntüle" onClick={() => navigate(route)}>
            Görüntüle
          </ToastAction>
        ),
      });
      previousRef.current = count;
    } else {
      previousRef.current = count;
    }
  };

  useEffect(() => {
    showRequestNotification(
      totalPartnerRequests,
      previousPartnerCountRef,
      '{count} bekleyen partner talebi var',
      '{count} yeni partner talebi geldi',
      'Partner Müsaitlik sayfasından inceleyin.',
      '/partner-availability'
    );
  }, [totalPartnerRequests]);

  useEffect(() => {
    showRequestNotification(
      totalViewerRequests,
      previousViewerCountRef,
      '{count} bekleyen izleyici talebi var',
      '{count} yeni izleyici talebi geldi',
      'İzleyici İstatistikleri sayfasından inceleyin.',
      '/viewer-stats'
    );
  }, [totalViewerRequests]);

  useEffect(() => {
    showRequestNotification(
      totalCustomerRequests,
      previousCustomerCountRef,
      '{count} bekleyen müşteri talebi var',
      '{count} yeni müşteri talebi geldi',
      'Müşteri Talepleri sayfasından inceleyin.',
      '/customer-requests'
    );
  }, [totalCustomerRequests]);

  useEffect(() => {
    showRequestNotification(
      openSupportRequests,
      previousSupportCountRef,
      '{count} açık destek talebi var',
      '{count} yeni destek talebi geldi',
      'Mesajlar sayfasından inceleyin.',
      '/messages?filter=human_intervention',
      'destructive'
    );
  }, [openSupportRequests]);

  useEffect(() => {
    showRequestNotification(
      pendingDeletionRequests,
      previousDeletionRequestCountRef,
      '{count} partner silme talebi onayınızı bekliyor',
      '{count} yeni partner silme talebi geldi',
      'Finans > Partner Müşteriler sayfasından inceleyin.',
      '/finance',
      'destructive'
    );
  }, [pendingDeletionRequests]);

  useEffect(() => {
    // Skip toast notifications on mobile - users can use the notification bell instead
    if (isMobile) return;
    
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
  }, [inAppNotifications, navigate, toast, isMobile]);

  return null;
}
