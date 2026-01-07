import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Loader2
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
  const [groupBy, setGroupBy] = useState<'daily' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [presetRange, setPresetRange] = useState<string>('last30');
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

  const { data: stats = [], isLoading } = useQuery<ViewerStat[]>({
    queryKey: ['/api/reservation-requests/stats', groupBy, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({ groupBy });
      if (dateRange.from) {
        params.append('from', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append('to', dateRange.to.toISOString());
      }
      const res = await fetch(`/api/reservation-requests/stats?${params}`, { credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: activityStats = [], isLoading: isLoadingActivityStats } = useQuery<PartnerActivityStat[]>({
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

  const groupedActivityStats = useMemo(() => {
    const grouped: Record<number, { name: string; phone: string | null; activities: Record<number, { name: string; guests: number; requests: number }> }> = {};
    
    activityStats.forEach(stat => {
      if (!grouped[stat.viewerId]) {
        grouped[stat.viewerId] = {
          name: stat.viewerName,
          phone: stat.viewerPhone,
          activities: {}
        };
      }
      grouped[stat.viewerId].activities[stat.activityId] = {
        name: stat.activityName,
        guests: stat.totalGuests,
        requests: stat.totalRequests
      };
    });
    
    return Object.entries(grouped).map(([id, data]) => ({
      viewerId: parseInt(id),
      viewerName: data.name,
      viewerPhone: data.phone,
      activities: Object.entries(data.activities).map(([actId, act]) => ({
        activityId: parseInt(actId),
        activityName: act.name,
        totalGuests: act.guests,
        totalRequests: act.requests
      })),
      totalGuests: Object.values(data.activities).reduce((sum, a) => sum + a.guests, 0),
      totalRequests: Object.values(data.activities).reduce((sum, a) => sum + a.requests, 0)
    })).sort((a, b) => b.totalGuests - a.totalGuests);
  }, [activityStats]);

  const viewerSummary = useMemo(() => {
    const summary: Record<number, { name: string; email: string; total: number; periods: string[] }> = {};
    
    if (!Array.isArray(stats)) return [];
    
    stats.forEach(stat => {
      if (!summary[stat.viewerId]) {
        summary[stat.viewerId] = {
          name: stat.viewerName,
          email: stat.viewerEmail,
          total: 0,
          periods: []
        };
      }
      summary[stat.viewerId].total += stat.count;
      summary[stat.viewerId].periods.push(stat.period);
    });
    
    return Object.entries(summary).map(([id, data]) => ({
      viewerId: parseInt(id),
      ...data,
      activePeriods: data.periods.length
    })).sort((a, b) => b.total - a.total);
  }, [stats]);

  const totalRequests = useMemo(() => 
    Array.isArray(stats) ? stats.reduce((sum, s) => sum + s.count, 0) : 0, 
    [stats]
  );

  const exportToCSV = () => {
    const headers = ['Is Ortagi', 'E-posta', 'Donem', 'Talep Sayisi'];
    const rows = stats.map(s => [s.viewerName, s.viewerEmail, s.period, s.count.toString()]);
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Is Ortaklari</h1>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={presetRange} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[120px]" data-testid="select-preset-range">
                <SelectValue placeholder="Tarih" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Son 7 gun</SelectItem>
                <SelectItem value="last30">Son 30 gun</SelectItem>
                <SelectItem value="last90">Son 90 gun</SelectItem>
                <SelectItem value="thisMonth">Bu ay</SelectItem>
                <SelectItem value="lastMonth">Gecen ay</SelectItem>
              </SelectContent>
            </Select>

            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'daily' | 'monthly')}>
              <SelectTrigger className="w-[100px]" data-testid="select-group-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Gunluk</SelectItem>
                <SelectItem value="monthly">Aylik</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-date-picker">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Talep</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-requests">{totalRequests}</div>
                <p className="text-xs text-muted-foreground">
                  {dateRange.from && dateRange.to && 
                    `${format(dateRange.from, 'd MMM', { locale: tr })} - ${format(dateRange.to, 'd MMM yyyy', { locale: tr })}`
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Is Ortagi</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-viewers">{viewerSummary.length}</div>
                <p className="text-xs text-muted-foreground">Talep gonderen partner sayisi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ortalama</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-average">
                  {viewerSummary.length > 0 ? (totalRequests / viewerSummary.length).toFixed(1) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Is ortagi basina ortalama talep</p>
              </CardContent>
            </Card>
          </div>

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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Is Ortagi Ozeti</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : viewerSummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bu tarih araliginda talep bulunamadi
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Is Ortagi</TableHead>
                        <TableHead className="hidden sm:table-cell">E-posta</TableHead>
                        <TableHead className="text-center">Donem</TableHead>
                        <TableHead className="text-right">Talep</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewerSummary.map((viewer) => (
                        <TableRow key={viewer.viewerId} data-testid={`row-viewer-${viewer.viewerId}`}>
                          <TableCell className="font-medium">{viewer.name}</TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{viewer.email}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{viewer.activePeriods}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{viewer.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aktivite Bazli Istatistikler</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingActivityStats ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : groupedActivityStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bu tarih araliginda veri bulunamadi
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Is Ortagi</TableHead>
                        <TableHead>Aktivite</TableHead>
                        <TableHead className="text-right">Kisi</TableHead>
                        <TableHead className="text-right">Talep</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedActivityStats.map((partner) => (
                        partner.activities.map((activity, actIndex) => (
                          <TableRow 
                            key={`${partner.viewerId}-${activity.activityId}`} 
                            data-testid={`row-activity-${partner.viewerId}-${activity.activityId}`}
                            className={actIndex === 0 ? "border-t-2" : ""}
                          >
                            <TableCell className="font-medium">
                              {actIndex === 0 ? partner.viewerName : ""}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{activity.activityName}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{activity.totalGuests}</TableCell>
                            <TableCell className="text-right">{activity.totalRequests}</TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Donem Detayi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : stats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bu tarih araliginda veri bulunamadi
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Donem</TableHead>
                        <TableHead>Is Ortagi</TableHead>
                        <TableHead className="text-right">Talep</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.map((stat, index) => (
                        <TableRow key={`${stat.viewerId}-${stat.period}-${index}`} data-testid={`row-stat-${index}`}>
                          <TableCell>
                            <Badge variant="outline">{stat.period}</Badge>
                          </TableCell>
                          <TableCell>{stat.viewerName}</TableCell>
                          <TableCell className="text-right font-semibold">{stat.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
      </main>
    </div>
  );
}
