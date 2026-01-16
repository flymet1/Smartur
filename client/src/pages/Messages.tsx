import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import { Check, User, Phone, Calendar, MessageCircle, Filter, AlertTriangle, UserX, Search, ExternalLink, Users, TrendingUp, HeadphonesIcon, BarChart3, Bot, Percent, Send, Loader2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FilterType = 'all' | 'with_reservation' | 'human_intervention';
type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

interface MessageAnalytics {
  period: string;
  startDate: string;
  endDate: string;
  metrics: {
    totalCustomers: number;
    uniqueCustomers: number;
    conversionsToSales: number;
    conversionRate: number;
    supportRequests: number;
    pendingInterventions: number;
    conversationsWithBotResponse: number;
    responseRate: number;
  };
}

interface Conversation {
  phone: string;
  messages: Array<{
    id: number;
    content: string;
    role: string;
    timestamp: string;
    requiresHumanIntervention: boolean;
  }>;
  hasReservation: boolean;
  reservationInfo?: {
    id: number;
    customerName: string;
    date: string;
    time: string;
    externalId?: string;
  };
  requiresHumanIntervention: boolean;
  supportRequest?: {
    id: number;
    status: string;
    createdAt: string;
  };
  lastMessageTime: string;
}

export default function Messages() {
  const searchParams = useSearch();
  const initialFilter = (() => {
    const params = new URLSearchParams(searchParams);
    const filterParam = params.get('filter');
    if (filterParam === 'human_intervention' || filterParam === 'with_reservation') {
      return filterParam;
    }
    return 'all';
  })();
  
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('daily');
  const [replyMessage, setReplyMessage] = useState("");
  const { toast } = useToast();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<MessageAnalytics>({
    queryKey: ['/api/conversations/analytics', analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/analytics?period=${analyticsPeriod}`);
      return res.json();
    }
  });

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations', filter],
    queryFn: async () => {
      const res = await fetch(`/api/conversations?filter=${filter}`);
      return res.json();
    }
  });

  useEffect(() => {
    if (conversations && searchParams) {
      const params = new URLSearchParams(searchParams);
      const phoneParam = params.get('phone');
      if (phoneParam) {
        const normalizedParam = phoneParam.replace(/\D/g, '');
        const foundConv = conversations.find(c => {
          const normalizedPhone = c.phone.replace(/\D/g, '');
          return normalizedPhone.includes(normalizedParam) || normalizedParam.includes(normalizedPhone);
        });
        if (foundConv) {
          setSelectedConversation(foundConv);
          setSearchQuery(phoneParam);
        }
      }
    }
  }, [conversations, searchParams]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.trim().toLowerCase();
    const normalizedSearch = searchQuery.replace(/\D/g, '');
    
    return conversations.filter(conv => {
      const normalizedPhone = conv.phone.replace(/\D/g, '');
      const customerName = conv.reservationInfo?.customerName?.toLowerCase() || '';
      
      // Phone number search (if query contains digits)
      if (normalizedSearch.length > 0) {
        if (normalizedPhone.includes(normalizedSearch)) return true;
      }
      
      // Name search
      if (customerName.includes(query)) return true;
      
      // Exact phone match
      if (conv.phone.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [conversations, searchQuery]);

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Format phone for WhatsApp - remove all non-digits and ensure country code
    let formattedPhone = phone.replace(/\D/g, '');
    // If starts with 0, replace with Turkey code
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '90' + formattedPhone.substring(1);
    }
    // If doesn't have country code, add Turkey code
    if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
      formattedPhone = '90' + formattedPhone;
    }
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const resolveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/support-requests/${id}/resolve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', filter] });
      toast({ title: "Tamamlandı", description: "Destek talebi kapatıldı." });
    }
  });

  const createSupportMutation = useMutation({
    mutationFn: async (phone: string) => {
      return apiRequest('POST', '/api/support-requests', { phone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', filter] });
      toast({ title: "Oluşturuldu", description: "Destek talebi oluşturuldu. Bot bu numaraya cevap vermeyecek." });
    }
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      return apiRequest('POST', '/api/send-whatsapp-custom-message', { phone, message });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', filter] });
      setReplyMessage("");
      if (selectedConversation) {
        const newMessage = {
          id: Date.now(),
          content: variables.message,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          requiresHumanIntervention: false
        };
        setSelectedConversation({
          ...selectedConversation,
          messages: [...selectedConversation.messages, newMessage]
        });
      }
      toast({ title: "Gönderildi", description: "Mesaj müşteriye iletildi." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Mesaj gönderilemedi. WhatsApp yapılandırmanızı kontrol edin.",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    return date.toLocaleDateString('tr-TR');
  };

  const getStatusBadge = (conv: Conversation) => {
    if (conv.supportRequest && conv.supportRequest.status === 'open') {
      return (
        <Badge variant="destructive" className="text-xs">
          Destek Bekliyor
        </Badge>
      );
    }
    if (conv.requiresHumanIntervention) {
      return (
        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Müdahale Gerekiyor
        </Badge>
      );
    }
    if (conv.hasReservation) {
      return (
        <Badge variant="secondary" className="text-xs">
          <Check className="w-3 h-3 mr-1" />
          Rezervasyonlu
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <MessageCircle className="w-3 h-3 mr-1" />
        Sohbet
      </Badge>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 xl:ml-64 p-4 pt-16 xl:pt-20 xl:px-8 xl:pb-8 pb-24 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">WhatsApp</h1>
            <p className="text-muted-foreground mt-1">WhatsApp bot görüşmeleri</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Telefon veya isim ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
                data-testid="input-search-messages"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <SelectTrigger className="w-[200px]" data-testid="select-message-filter">
                  <SelectValue placeholder="Filtre seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Mesajlar</SelectItem>
                  <SelectItem value="with_reservation">Rezervasyonlu Müşteriler</SelectItem>
                  <SelectItem value="human_intervention">Müdahale Gerekiyor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Mesaj Analizi</h2>
            </div>
            <Tabs value={analyticsPeriod} onValueChange={(v) => setAnalyticsPeriod(v as AnalyticsPeriod)}>
              <TabsList>
                <TabsTrigger value="daily" data-testid="tab-analytics-daily">Günlük</TabsTrigger>
                <TabsTrigger value="weekly" data-testid="tab-analytics-weekly">Haftalik</TabsTrigger>
                <TabsTrigger value="monthly" data-testid="tab-analytics-monthly">Aylık</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Yazan Müşteri</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-total-customers">
                      {analytics?.metrics.uniqueCustomers ?? analytics?.metrics.totalCustomers ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analyticsPeriod === 'daily' ? 'Bugün' : analyticsPeriod === 'weekly' ? 'Son 7 gun' : 'Son 30 gun'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Satisa Donen</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600" data-testid="text-conversions">
                      {analytics?.metrics.conversionsToSales ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Rezervasyon yapan</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Destek Talebi</CardTitle>
                <HeadphonesIcon className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-orange-500" data-testid="text-support-requests">
                      {analytics?.metrics.supportRequests ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Destek istegi</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Donusum Orani</CardTitle>
                <Percent className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-primary" data-testid="text-conversion-rate">
                      %{analytics?.metrics.conversionRate ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Satisa donusum</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Bot Yanit</CardTitle>
                <Bot className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-blue-500" data-testid="text-bot-responses">
                      {analytics?.metrics.conversationsWithBotResponse ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Yanit verilen</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Mudahale</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-interventions">
                      {analytics?.metrics.pendingInterventions ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Bekleyen</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Arama sonuçu bulunamadı" : "Henüz mesaj yok"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredConversations.map((conv) => (
              <Card 
                key={conv.phone} 
                className="p-6 hover-elevate cursor-pointer"
                onClick={() => setSelectedConversation(conv)}
                data-testid={`card-conversation-${conv.phone}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 
                          className="font-bold flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:underline cursor-pointer" 
                          data-testid={`text-phone-${conv.phone}`}
                          onClick={(e) => openWhatsApp(conv.phone, e)}
                          title="WhatsApp'ta aç"
                        >
                          <SiWhatsapp className="w-4 h-4" />
                          {conv.phone}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </h3>
                        <p className="text-xs text-muted-foreground">{formatDate(conv.lastMessageTime)}</p>
                      </div>
                    </div>

                    {conv.hasReservation && conv.reservationInfo && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 mb-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {conv.reservationInfo.customerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {conv.reservationInfo.date}
                        </span>
                        {conv.reservationInfo.externalId && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            #{conv.reservationInfo.externalId}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="bg-muted/30 p-3 rounded-lg mt-2">
                      {conv.messages.slice(0, 2).map((msg, idx) => (
                        <p key={idx} className="text-sm mb-1 last:mb-0">
                          <span className={`font-medium ${msg.role === 'user' ? '' : 'text-primary'}`}>
                            {msg.role === 'user' ? 'Kullanıcı:' : 'Bot:'}
                          </span>{' '}
                          <span className="line-clamp-1">{msg.content}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(conv)}
                    
                    {conv.supportRequest && conv.supportRequest.status === 'open' ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveMutation.mutate(conv.supportRequest!.id);
                        }}
                        disabled={resolveMutation.isPending}
                        data-testid={`button-resolve-${conv.phone}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Tamamlandı
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          createSupportMutation.mutate(conv.phone);
                        }}
                        disabled={createSupportMutation.isPending}
                        data-testid={`button-create-support-${conv.phone}`}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Destek Talebi Oluştur
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              <span 
                className="flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:underline cursor-pointer"
                onClick={(e) => selectedConversation && openWhatsApp(selectedConversation.phone, e)}
                title="WhatsApp'ta aç"
              >
                <SiWhatsapp className="w-4 h-4" />
                {selectedConversation?.phone}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {selectedConversation?.messages
              .slice()
              .reverse()
              .map((msg, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-muted/50 ml-0 mr-12' 
                      : 'bg-primary/10 ml-12 mr-0'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-medium ${msg.role === 'user' ? '' : 'text-primary'}`}>
                      {msg.role === 'user' ? 'Müşteri' : 'Bot'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
          </div>

          <div className="flex-shrink-0 border-t pt-4 space-y-3">
            <div className="flex gap-2">
              <Textarea 
                placeholder="Müşteriye yanıt yazın..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={2}
                className="flex-1 resize-none"
                data-testid="input-reply-message"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && replyMessage.trim() && selectedConversation) {
                    e.preventDefault();
                    sendReplyMutation.mutate({ phone: selectedConversation.phone, message: replyMessage.trim() });
                  }
                }}
              />
              <Button 
                onClick={() => {
                  if (selectedConversation && replyMessage.trim()) {
                    sendReplyMutation.mutate({ phone: selectedConversation.phone, message: replyMessage.trim() });
                  }
                }}
                disabled={!replyMessage.trim() || sendReplyMutation.isPending}
                data-testid="button-send-reply"
              >
                {sendReplyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter ile gönder, Shift+Enter ile yeni satır ekle
            </p>
            
            {selectedConversation?.supportRequest && selectedConversation.supportRequest.status === 'open' && (
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => {
                  resolveMutation.mutate(selectedConversation.supportRequest!.id);
                  setSelectedConversation(null);
                }}
                disabled={resolveMutation.isPending}
                data-testid="button-resolve-modal"
              >
                <Check className="w-4 h-4 mr-2" />
                Destek Talebini Kapat
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
