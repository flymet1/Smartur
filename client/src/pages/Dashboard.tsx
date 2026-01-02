import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatCard } from "@/components/ui/StatCard";
import { useReservationStats, useReservations } from "@/hooks/use-reservations";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, Users, DollarSign, X, Clock, MapPin, ClipboardList, MessageSquare, Shield, AlertTriangle, CheckCircle, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const periodLabels: Record<Period, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  yearly: 'Yıllık'
};

interface ChartDataPoint {
  name: string;
  date: string;
  salesTl: number;
  salesUsd: number;
  reservationCount: number;
}

interface DateDetails {
  date: string;
  totalReservations: number;
  totalQuantity: number;
  totalSalesTl: number;
  totalSalesUsd: number;
  activities: Array<{
    activityId: number;
    activityName: string;
    reservationCount: number;
    totalQuantity: number;
    salesTl: number;
    salesUsd: number;
  }>;
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useReservationStats();
  const { data: reservations, isLoading: reservationsLoading } = useReservations();
  
  const { data: detailedStats, isLoading: detailedLoading } = useQuery<{
    period: Period;
    chartData: ChartDataPoint[];
    totals: { reservations: number; salesTl: number; salesUsd: number };
  }>({
    queryKey: ['/api/reservations/detailed-stats', selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/reservations/detailed-stats?period=${selectedPeriod}`);
      return res.json();
    }
  });

  const { data: dateDetails, isLoading: dateDetailsLoading } = useQuery<DateDetails>({
    queryKey: ['/api/reservations/date-details', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/reservations/date-details?date=${selectedDate}`);
      return res.json();
    },
    enabled: !!selectedDate
  });

  const { data: customerRequests } = useQuery<{ id: number; status: string }[]>({
    queryKey: ['/api/customer-requests'],
    queryFn: async () => {
      const res = await fetch('/api/customer-requests');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const pendingRequestsCount = customerRequests?.filter(r => r.status === 'pending').length || 0;

  // License query
  interface LicenseData {
    license: {
      id: number;
      licenseKey: string;
      agencyName: string;
      planType: string;
      planName: string;
      maxActivities: number;
      maxReservationsPerMonth: number;
      expiryDate: string | null;
      isActive: boolean;
    } | null;
    usage: {
      activitiesUsed: number;
      reservationsThisMonth: number;
    };
    status: {
      valid: boolean;
      message: string;
    };
  }

  const { data: licenseData, isLoading: licenseLoading } = useQuery<LicenseData>({
    queryKey: ['/api/license'],
    queryFn: async () => {
      const res = await fetch('/api/license');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const chartData = detailedStats?.chartData || [];

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload as ChartDataPoint;
      if (clickedData.date && selectedPeriod !== 'yearly') {
        setSelectedDate(clickedData.date);
        setDetailsOpen(true);
      }
    }
  };

  if (statsLoading || reservationsLoading) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </main>
      </div>
    );
  }

  const recentReservations = reservations?.slice(0, 5) || [];

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Genel Bakış</h1>
            <p className="text-muted-foreground mt-1">Hoş geldiniz, bugünün operasyon özeti.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/reservations?date=${format(new Date(), "yyyy-MM-dd")}`}>
              <Button variant="outline" data-testid="button-today-reservations">
                <ClipboardList className="w-4 h-4 mr-2" />
                Bugünün Rezervasyonları
              </Button>
            </Link>
            <Link href="/customer-requests">
              <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border shadow-sm hover-elevate cursor-pointer ${
                pendingRequestsCount > 0 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' 
                  : 'bg-white dark:bg-card text-muted-foreground border-border'
              }`} data-testid="link-pending-requests">
                <MessageSquare className="w-4 h-4" />
                <span>{pendingRequestsCount > 0 ? `${pendingRequestsCount} Yeni Talep` : 'Bekleyen Talep Yok'}</span>
              </div>
            </Link>
            <div 
              className="flex items-center gap-2 text-sm text-muted-foreground bg-white dark:bg-card px-4 py-2 rounded-full border shadow-sm cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setLicenseDialogOpen(true)}
              data-testid="button-system-status"
            >
              <span className={`w-2 h-2 rounded-full ${licenseData?.status.valid ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></span>
              {licenseData?.status.valid ? 'Sistem Aktif' : 'Dikkat Gerekli'}
            </div>
          </div>
        </div>

        {/* License Info Dialog */}
        <Dialog open={licenseDialogOpen} onOpenChange={setLicenseDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Uyelik Bilgileri
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {licenseData?.license ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-sm text-muted-foreground">Durum</p>
                      <p className={`font-bold ${licenseData.status.valid ? 'text-green-600' : 'text-orange-600'}`}>
                        {licenseData.status.valid ? 'Aktif' : 'Dikkat Gerekli'}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-bold">{licenseData.license.planName}</p>
                      <Badge variant="secondary" className="mt-1">{licenseData.license.planType}</Badge>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-sm text-muted-foreground">Acenta</p>
                      <p className="font-bold">{licenseData.license.agencyName || '-'}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-sm text-muted-foreground">Bitis Tarihi</p>
                      <p className="font-bold">
                        {licenseData.license.expiryDate 
                          ? new Date(licenseData.license.expiryDate).toLocaleDateString('tr-TR')
                          : 'Sinirsiz'}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Kullanim Limitleri</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Aktiviteler:</span>
                        <span className="font-medium">
                          {licenseData.usage.activitiesUsed} / {licenseData.license.maxActivities}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Aylik Rezervasyonlar:</span>
                        <span className="font-medium">
                          {licenseData.usage.reservationsThisMonth} / {licenseData.license.maxReservationsPerMonth}
                        </span>
                      </div>
                    </div>
                  </div>
                  {licenseData.status.message && (
                    <p className="text-sm text-muted-foreground">{licenseData.status.message}</p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="font-bold text-orange-700 dark:text-orange-300">Lisans Bulunamadi</p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Lutfen ayarlar sayfasindan lisans bilgilerinizi girin.</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setLicenseDialogOpen(false)}>Kapat</Button>
                <Link href="/settings">
                  <Button onClick={() => setLicenseDialogOpen(false)} data-testid="button-go-to-settings">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Uyelik Yonetimi
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Toplam Rezervasyon" 
            value={stats?.totalReservations || 0} 
            icon={Calendar} 
            trend="Geçen haftaya göre %12" 
            trendUp={true}
          />
          <StatCard 
            label="Toplam Gelir (TL)" 
            value={`₺${(stats?.totalRevenueTl || 0).toLocaleString('tr-TR')}`} 
            icon={DollarSign} 
            trend={`$${(stats?.totalRevenueUsd || 0).toLocaleString('en-US')} USD`}
            trendUp={true}
          />
          <StatCard 
            label="Aktif Müşteriler" 
            value={124} 
            icon={Users} 
          />
          <StatCard 
            label="Doluluk Oranı" 
            value="%78" 
            icon={TrendingUp} 
          />
        </div>

        {/* License Status Card */}
        <Card className="border" data-testid="card-license-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Uyelik Durumu
            </CardTitle>
            <Link href="/settings">
              <Button variant="outline" size="sm" data-testid="button-manage-subscription">
                <CreditCard className="w-4 h-4 mr-2" />
                Uyelik Yonetimi
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {licenseLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : licenseData?.license ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  {licenseData.status.valid ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Durum</p>
                    <p className={`font-bold ${licenseData.status.valid ? 'text-green-600' : 'text-orange-600'}`} data-testid="text-license-status">
                      {licenseData.status.valid ? 'Aktif' : 'Dikkat'}
                    </p>
                  </div>
                </div>
                
                {/* Plan */}
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-bold" data-testid="text-license-plan">{licenseData.license.planName || 'Deneme'}</p>
                  <Badge variant="secondary" className="mt-1">{licenseData.license.planType}</Badge>
                </div>
                
                {/* Usage */}
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">Kullanim</p>
                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-sm">
                      <span>Aktivite:</span>
                      <span className="font-medium" data-testid="text-activities-usage">
                        {licenseData.usage.activitiesUsed}/{licenseData.license.maxActivities}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Aylik Rez.:</span>
                      <span className="font-medium" data-testid="text-reservations-usage">
                        {licenseData.usage.reservationsThisMonth}/{licenseData.license.maxReservationsPerMonth}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Expiry */}
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">Bitis Tarihi</p>
                  <p className="font-bold" data-testid="text-license-expiry">
                    {licenseData.license.expiryDate 
                      ? new Date(licenseData.license.expiryDate).toLocaleDateString('tr-TR')
                      : 'Sinirsiz'}
                  </p>
                  {licenseData.license.expiryDate && new Date(licenseData.license.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                    <Badge variant="destructive" className="mt-1">Yaklasıyor</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="font-bold text-orange-700 dark:text-orange-300">Lisans Bulunamadi</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Lutfen ayarlar sayfasindan lisans bilgilerinizi girin.</p>
                </div>
                <Link href="/settings">
                  <Button variant="default" size="sm" data-testid="button-activate-license">
                    Lisans Aktive Et
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 dashboard-card p-6">
            {/* Period Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-bold">Satış Grafiği</h3>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(periodLabels) as Period[]).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                    data-testid={`button-period-${period}`}
                  >
                    {periodLabels[period]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Period Totals */}
            {detailedStats && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-sm text-muted-foreground">Rezervasyon</p>
                  <p className="text-xl font-bold" data-testid="text-period-reservations">
                    {detailedStats.totals.reservations}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-sm text-muted-foreground">TL Satış</p>
                  <p className="text-xl font-bold text-blue-600" data-testid="text-period-sales-tl">
                    ₺{detailedStats.totals.salesTl.toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-sm text-muted-foreground">USD Satış</p>
                  <p className="text-xl font-bold text-green-600" data-testid="text-period-sales-usd">
                    ${detailedStats.totals.salesUsd.toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            )}

            {detailedLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">TL Bazlı Satışlar</p>
                  <p className="text-xs text-muted-foreground mb-2">Detay için grafiğe tıklayın</p>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} onClick={handleBarClick}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6b7280" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          angle={selectedPeriod === 'monthly' ? -45 : 0}
                          textAnchor={selectedPeriod === 'monthly' ? 'end' : 'middle'}
                          height={selectedPeriod === 'monthly' ? 60 : 30}
                        />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₺${value}`} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, 'TL Satış']}
                        />
                        <Bar dataKey="salesTl" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="TL Satış" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">USD Bazlı Satışlar</p>
                  <p className="text-xs text-muted-foreground mb-2">Detay için grafiğe tıklayın</p>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} onClick={handleBarClick}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6b7280" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          angle={selectedPeriod === 'monthly' ? -45 : 0}
                          textAnchor={selectedPeriod === 'monthly' ? 'end' : 'middle'}
                          height={selectedPeriod === 'monthly' ? 60 : 30}
                        />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          formatter={(value: number) => [`$${value.toLocaleString('en-US')}`, 'USD Satış']}
                        />
                        <Bar dataKey="salesUsd" fill="#10b981" radius={[4, 4, 0, 0]} name="USD Satış" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-card p-6">
            <h3 className="text-lg font-bold mb-6">Popüler Aktiviteler</h3>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.popularActivities || [{name: 'ATV Turu', count: 10}, {name: 'Rafting', count: 5}]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {(stats?.popularActivities || [1,2]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {(stats?.popularActivities || [{name: 'ATV Turu', count: 10}, {name: 'Rafting', count: 5}]).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.count} Rez.</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reservations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Son Rezervasyonlar</h3>
            <a href="/reservations" className="text-sm text-primary hover:underline font-medium" data-testid="link-view-all-reservations">Tümünü Gör</a>
          </div>
          <ReservationTable reservations={recentReservations} />
        </div>
      </main>

      {/* Date Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedDate && new Date(selectedDate).toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} Detayları
            </DialogTitle>
          </DialogHeader>
          
          {dateDetailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : dateDetails ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Rezervasyon</p>
                    <p className="text-2xl font-bold" data-testid="text-date-reservations">{dateDetails.totalReservations}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Kişi Sayısı</p>
                    <p className="text-2xl font-bold" data-testid="text-date-quantity">{dateDetails.totalQuantity}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">TL Satış</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-date-sales-tl">
                      ₺{dateDetails.totalSalesTl.toLocaleString('tr-TR')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">USD Satış</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-date-sales-usd">
                      ${dateDetails.totalSalesUsd.toLocaleString('en-US')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Breakdown */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Aktivite Bazlı Dağılım
                </h4>
                
                {dateDetails.activities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Bu tarihte rezervasyon bulunmuyor.</p>
                ) : (
                  <div className="space-y-3">
                    {dateDetails.activities.map((activity, idx) => (
                      <Card key={activity.activityId} data-testid={`card-activity-${activity.activityId}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                              <div>
                                <p className="font-medium">{activity.activityName}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.reservationCount} Rezervasyon
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {activity.totalQuantity} Kişi
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-blue-600">
                                ₺{activity.salesTl.toLocaleString('tr-TR')}
                              </p>
                              <p className="text-xs text-green-600">
                                ${activity.salesUsd.toLocaleString('en-US')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Veri yüklenemedi.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
