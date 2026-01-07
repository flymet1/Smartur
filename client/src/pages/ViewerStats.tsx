import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Users, 
  TrendingUp, 
  Download,
  BarChart3,
  Send,
  MessageSquare,
  Loader2,
  Filter
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViewerStat {
  viewerId: number;
  viewerName: string;
  viewerEmail: string;
  period: string;
  count: number;
}

interface PartnerUser {
  id: number;
  username: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface PartnerActivityStat {
  viewerId: number;
  viewerName: string;
  viewerPhone: string | null;
  activityId: number;
  activityName: string;
  totalGuests: number;
  totalRequests: number;
}

export default function ViewerStats() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [presetRange, setPresetRange] = useState<string>('last30');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");
  const [bulkMessage, setBulkMessage] = useState("");
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  const { data: partnerUsers = [] } = useQuery<PartnerUser[]>({
    queryKey: ['/api/tenant-users'],
  });

  const partnersWithPhone = useMemo(() => 
    partnerUsers.filter(u => u.phone && u.phone.trim() !== ''),
    [partnerUsers]
  );

  const sendBulkMessage = async () => {
    if (!bulkMessage.trim()) {
      toast({ title: "Hata", description: "Mesaj icerigi giriniz.", variant: "destructive" });
      return;
    }
    if (partnersWithPhone.length === 0) {
      toast({ title: "Hata", description: "Telefon numarasi olan is ortagi bulunamadi.", variant: "destructive" });
      return;
    }

    setIsSendingBulk(true);
    let successCount = 0;
    let failCount = 0;

    for (const partner of partnersWithPhone) {
      try {
        await apiRequest('POST', '/api/send-whatsapp-custom-message', {
          phone: partner.phone,
          message: bulkMessage.replace(/{isim}/gi, partner.name || partner.username)
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsSendingBulk(false);
    setBulkMessage("");
    
    if (successCount > 0) {
      toast({ 
        title: "Toplu mesaj gonderildi", 
        description: `${successCount} is ortagina mesaj gonderildi${failCount > 0 ? `, ${failCount} basarisiz` : ''}.` 
      });
    } else {
      toast({ title: "Hata", description: "Mesajlar gonderilemedi.", variant: "destructive" });
    }
  };

  const handlePresetChange = (preset: string) => {
    setPresetRange(preset);
    const now = new Date();
    
    switch (preset) {
      case 'last7':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'last30':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'last90':
        setDateRange({ from: subDays(now, 90), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
    }
  };

  const { data: activityStats = [], isLoading } = useQuery<PartnerActivityStat[]>({
    queryKey: ['/api/partner-activity-stats', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append('from', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append('to', dateRange.to.toISOString());
      }
      const res = await fetch(`/api/partner-activity-stats?${params}`, { credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const groupedStats = useMemo(() => {
    const grouped: Record<number, { 
      name: string; 
      phone: string | null; 
      activities: { activityId: number; activityName: string; guests: number; requests: number }[];
      totalGuests: number;
      totalRequests: number;
    }> = {};
    
    activityStats.forEach(stat => {
      if (!grouped[stat.viewerId]) {
        grouped[stat.viewerId] = {
          name: stat.viewerName,
          phone: stat.viewerPhone,
          activities: [],
          totalGuests: 0,
          totalRequests: 0
        };
      }
      grouped[stat.viewerId].activities.push({
        activityId: stat.activityId,
        activityName: stat.activityName,
        guests: stat.totalGuests,
        requests: stat.totalRequests
      });
      grouped[stat.viewerId].totalGuests += stat.totalGuests;
      grouped[stat.viewerId].totalRequests += stat.totalRequests;
    });
    
    return Object.entries(grouped).map(([id, data]) => ({
      viewerId: parseInt(id),
      ...data
    })).sort((a, b) => b.totalGuests - a.totalGuests);
  }, [activityStats]);

  const filteredStats = useMemo(() => {
    if (selectedPartnerId === 'all') return groupedStats;
    return groupedStats.filter(s => s.viewerId === parseInt(selectedPartnerId));
  }, [groupedStats, selectedPartnerId]);

  const totalGuests = useMemo(() => 
    filteredStats.reduce((sum, s) => sum + s.totalGuests, 0), 
    [filteredStats]
  );

  const totalRequests = useMemo(() => 
    filteredStats.reduce((sum, s) => sum + s.totalRequests, 0), 
    [filteredStats]
  );

  const exportToCSV = () => {
    const headers = ['Is Ortagi', 'Aktivite', 'Kisi Sayisi', 'Talep Sayisi'];
    const rows: string[][] = [];
    
    filteredStats.forEach(partner => {
      partner.activities.forEach(act => {
        rows.push([partner.name, act.activityName, act.guests.toString(), act.requests.toString()]);
      });
    });
    
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `is-ortagi-istatistikleri-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Is Ortaklari</h1>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
              <SelectTrigger className="w-[200px]" data-testid="select-partner-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Is Ortagi Sec" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Is Ortaklari</SelectItem>
                {groupedStats.map((partner) => (
                  <SelectItem key={partner.viewerId} value={partner.viewerId.toString()}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={presetRange} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[140px]" data-testid="select-preset-range">
                <SelectValue placeholder="Tarih Araligi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Son 7 gun</SelectItem>
                <SelectItem value="last30">Son 30 gun</SelectItem>
                <SelectItem value="last90">Son 90 gun</SelectItem>
                <SelectItem value="thisMonth">Bu ay</SelectItem>
                <SelectItem value="lastMonth">Gecen ay</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-date-picker">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range) {
                      setDateRange({ from: range.from, to: range.to });
                      setPresetRange('custom');
                    }
                  }}
                  locale={tr}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              CSV Indir
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kisi</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-guests">{totalGuests}</div>
              <p className="text-xs text-muted-foreground">
                {dateRange.from && dateRange.to && 
                  `${format(dateRange.from, 'd MMM', { locale: tr })} - ${format(dateRange.to, 'd MMM yyyy', { locale: tr })}`
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Talep</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-requests">{totalRequests}</div>
              <p className="text-xs text-muted-foreground">Rezervasyon talebi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Is Ortagi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-partners">{groupedStats.length}</div>
              <p className="text-xs text-muted-foreground">Talep gonderen partner</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="stats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stats" data-testid="tab-stats">Istatistikler</TabsTrigger>
            <TabsTrigger value="message" data-testid="tab-message">Toplu Mesaj</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Is Ortagi Performansi</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Bu tarih araliginda veri bulunamadi
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Is Ortagi</TableHead>
                          <TableHead>Aktiviteler</TableHead>
                          <TableHead className="text-right">Kisi</TableHead>
                          <TableHead className="text-right">Talep</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStats.map((partner) => (
                          <TableRow key={partner.viewerId} data-testid={`row-partner-${partner.viewerId}`}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{partner.name}</div>
                                {partner.phone && (
                                  <div className="text-xs text-muted-foreground">{partner.phone}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {partner.activities.map((act) => (
                                  <Badge key={act.activityId} variant="outline" className="text-xs">
                                    {act.activityName} ({act.guests})
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{partner.totalGuests}</TableCell>
                            <TableCell className="text-right">{partner.totalRequests}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="message">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Toplu WhatsApp Bildirimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkMessage">Mesaj Icerigi</Label>
                  <Textarea
                    id="bulkMessage"
                    placeholder="Merhaba {isim}, size onemli bir duyuru yapmak istiyoruz..."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    rows={4}
                    data-testid="input-bulk-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kullanilabilir degiskenler: {"{isim}"} - Is ortaginin adi
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    {partnersWithPhone.length} is ortagina mesaj gonderilecek
                  </p>
                  <Button 
                    onClick={sendBulkMessage} 
                    disabled={isSendingBulk || partnersWithPhone.length === 0}
                    data-testid="button-send-bulk"
                  >
                    {isSendingBulk ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isSendingBulk ? "Gonderiliyor..." : "Toplu Gonder"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
