import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import { Check, User, Phone, Calendar, MessageCircle, Filter, AlertTriangle, UserX, Search, ExternalLink, Users, TrendingUp, HeadphonesIcon, BarChart3, Bot, Percent, Send, Loader2, HelpCircle, CheckCircle, X } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

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
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-display">WhatsApp</h1>
              <p className="text-muted-foreground text-sm mt-1">WhatsApp bot görüşmeleri ve test</p>
            </div>
            
            {/* Mobile: Compact search + filter button */}
            <div className="flex md:hidden items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant={filter !== 'all' ? "default" : "outline"} 
                    size="icon" 
                    className="h-9 w-9"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl">
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Arama ve Filtreler
                    </SheetTitle>
                  </SheetHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Arama</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Telefon veya isim ara..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-12"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Filtre</Label>
                      <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                        <SelectTrigger className="w-full h-12">
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
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Mobile: Search bar below title */}
          <div className="md:hidden relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Telefon veya isim ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
              data-testid="input-search-messages-mobile"
            />
          </div>

          {/* Desktop: Full search and filter */}
          <div className="hidden md:flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Telefon veya isim ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
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

        {/* Bot Test Section */}
        <BotTestSection />

        {/* Unanswered Questions Section */}
        <UnansweredQuestionsSection />

        {/* Analytics Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Mesaj Analizi</h2>
            </div>
            <Tabs value={analyticsPeriod} onValueChange={(v) => setAnalyticsPeriod(v as AnalyticsPeriod)} className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="daily" data-testid="tab-analytics-daily">Günlük</TabsTrigger>
                <TabsTrigger value="weekly" data-testid="tab-analytics-weekly">Haftalık</TabsTrigger>
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

// === BOT TEST SECTION ===
function BotTestSection() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("+90532");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: "Hata", description: "Mesaj gereklidir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Use dedicated bot test endpoint with proper tenant context
      const res = await fetch("/api/bot-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone,
          message,
          conversationHistory: history, // Send conversation history for context
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Bilinmeyen hata" }));
        throw new Error(errorData.error || "Bot yanıt veremedi");
      }

      const data = await res.json();
      
      // Update history with new conversation
      setHistory(data.history || [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: data.response },
      ]);
      setMessage("");
      
    } catch (error: any) {
      toast({ 
        title: "Hata", 
        description: error.message || "Bot test edilirken hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Bot Test Aracı</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                  Aktif
                </Badge>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Chat Area */}
              <div className="lg:col-span-2 space-y-4">
                {/* Chat Messages */}
                <div className="border rounded-lg p-4 h-64 overflow-y-auto space-y-3 bg-muted/30">
                  {history.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                      <div>
                        <p className="text-sm font-semibold mb-1">Henüz mesaj yok</p>
                        <p className="text-xs">Botu test etmek için aşağıda bir mesaj yazın</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {history.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-muted text-foreground rounded-bl-none"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="test-phone" className="text-xs">Telefon</Label>
                      <Input
                        id="test-phone"
                        placeholder="+905321234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="text-sm"
                        data-testid="input-bot-test-phone"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleSend}
                        disabled={loading}
                        className="w-full"
                        data-testid="button-bot-test-send"
                      >
                        {loading ? "Gönderiliyor..." : "Gönder"}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="test-message" className="text-xs">Mesaj</Label>
                    <Textarea
                      id="test-message"
                      placeholder="Botunuza göndermek istediğiniz mesajı yazın..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) {
                          handleSend();
                        }
                      }}
                      className="h-16 text-sm"
                      data-testid="input-bot-test-message"
                    />
                  </div>
                </div>
              </div>

              {/* Bot Info */}
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Bot Bilgisi
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <Badge variant="secondary" className="text-xs">GPT-4o</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yedek</span>
                      <Badge variant="outline" className="text-xs">Gemini 2.5 Flash</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dil</span>
                      <span className="font-medium">Türkçe / English</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Durum</span>
                      <span className="flex items-center gap-1 font-medium text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Aktif
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 text-xs mb-2">İpuçları</h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li>Türkçe veya İngilizce soru sorun</li>
                    <li>Bot aktiviteleri ve kapasiteyi görebilir</li>
                    <li>Rezervasyon yapabilir</li>
                    <li>Ctrl+Enter ile hızlı gönder</li>
                  </ul>
                </div>

                {history.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setHistory([])}
                    data-testid="button-clear-chat"
                  >
                    Sohbeti Temizle
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// === UNANSWERED QUESTIONS SECTION ===
interface UnansweredQuestion {
  id: number;
  tenantId: number;
  customerPhone: string;
  customerQuestion: string;
  botResponse: string | null;
  conversationContext: string | null;
  status: 'pending' | 'handled' | 'ignored';
  handledAt: string | null;
  handledBy: string | null;
  notes: string | null;
  createdAt: string;
}

function UnansweredQuestionsSection() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: questions = [], isLoading, refetch } = useQuery<UnansweredQuestion[]>({
    queryKey: ['/api/unanswered-questions', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/unanswered-questions?status=pending', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['/api/unanswered-questions/count'],
    refetchInterval: 30000
  });

  const handleMark = async (id: number, status: 'handled' | 'ignored') => {
    try {
      const res = await fetch(`/api/unanswered-questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update');
      toast({ title: status === 'handled' ? 'İşlendi' : 'Yoksayıldı', description: 'Soru güncellendi.' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/unanswered-questions/count'] });
    } catch {
      toast({ title: 'Hata', description: 'Güncellenemedi.', variant: 'destructive' });
    }
  };

  const pendingCount = countData?.count || questions.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-orange-200 dark:border-orange-800">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">Cevaplanamayan Sorular</CardTitle>
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{pendingCount}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {isOpen ? 'Kapat' : 'Aç'}
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Cevaplanamayan soru bulunmuyor.</p>
                <p className="text-xs mt-1">Bot "bilmiyorum" dediğinde buraya düşecek.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((q) => (
                  <div key={q.id} className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">{q.customerPhone}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <p className="font-medium text-sm mb-1">"{q.customerQuestion}"</p>
                        {q.botResponse && (
                          <p className="text-xs text-muted-foreground italic">Bot: {q.botResponse.substring(0, 100)}...</p>
                        )}
                        {q.conversationContext && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Konuşma bağlamı</summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded whitespace-pre-wrap">{q.conversationContext}</pre>
                          </details>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleMark(q.id, 'handled')}
                          title="FAQ'a ekledim olarak işaretle"
                          data-testid={`button-handle-${q.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          onClick={() => handleMark(q.id, 'ignored')}
                          title="Yoksay"
                          data-testid={`button-ignore-${q.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground border-t pt-3">
              <p><strong>Nasıl kullanılır:</strong> Botun cevaplayamadığı sorular burada listelenir. İlgili FAQ'a cevabı ekledikten sonra yeşil tik ile "işlendi" işaretleyin.</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
