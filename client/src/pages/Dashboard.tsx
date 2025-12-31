import { Sidebar } from "@/components/layout/Sidebar";
import { StatCard } from "@/components/ui/StatCard";
import { useReservationStats, useReservations } from "@/hooks/use-reservations";
import { Calendar, TrendingUp, Users, DollarSign } from "lucide-react";
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
  Cell
} from "recharts";
import { ReservationTable } from "@/components/reservations/ReservationTable";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useReservationStats();
  const { data: reservations, isLoading: reservationsLoading } = useReservations();

  // Mock data for charts if API not ready
  const chartData = [
    { name: 'Pzt', sales: 4000 },
    { name: 'Sal', sales: 3000 },
    { name: 'Çar', sales: 2000 },
    { name: 'Per', sales: 2780 },
    { name: 'Cum', sales: 1890 },
    { name: 'Cmt', sales: 2390 },
    { name: 'Paz', sales: 3490 },
  ];

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
            <h1 className="text-3xl font-bold text-foreground">Genel Bakış</h1>
            <p className="text-muted-foreground mt-1">Hoş geldiniz, bugünün operasyon özeti.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white px-4 py-2 rounded-full border shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Sistem Aktif
          </div>
        </div>

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
            label="Toplam Gelir" 
            value={`₺${(stats?.totalRevenue || 0).toLocaleString('tr-TR')}`} 
            icon={DollarSign} 
            trend="Geçen aya göre %8" 
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 dashboard-card p-6">
            <h3 className="text-lg font-bold mb-6">Haftalık Satış Grafiği</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₺${value}`} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
            <a href="/reservations" className="text-sm text-primary hover:underline font-medium">Tümünü Gör</a>
          </div>
          <ReservationTable reservations={recentReservations} />
        </div>
      </main>
    </div>
  );
}
