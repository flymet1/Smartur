import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Users, 
  TrendingUp, 
  Download,
  BarChart3
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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

export default function ViewerStats() {
  const [groupBy, setGroupBy] = useState<'daily' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [presetRange, setPresetRange] = useState<string>('last30');

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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-xl font-bold" data-testid="text-page-title">Is Ortagi Istatistikleri</h1>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={presetRange} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[130px]" data-testid="select-preset-range">
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
                <SelectTrigger className="w-[110px]" data-testid="select-group-by">
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
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
            <CardHeader>
              <CardTitle>Is Ortagi Ozeti</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : viewerSummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bu tarih araliginda talep bulunamadi
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Is Ortagi</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead className="text-center">Aktif Donem</TableHead>
                      <TableHead className="text-right">Toplam Talep</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewerSummary.map((viewer) => (
                      <TableRow key={viewer.viewerId} data-testid={`row-viewer-${viewer.viewerId}`}>
                        <TableCell className="font-medium">{viewer.name}</TableCell>
                        <TableCell className="text-muted-foreground">{viewer.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{viewer.activePeriods}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{viewer.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Donem Detayi</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : stats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bu tarih araliginda veri bulunamadi
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donem</TableHead>
                      <TableHead>Is Ortagi</TableHead>
                      <TableHead className="text-right">Talep Sayisi</TableHead>
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
