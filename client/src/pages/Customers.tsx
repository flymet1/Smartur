import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Search, Users, Phone, Mail, Ticket, TrendingUp, Calendar, ArrowUpDown, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type Customer = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  pendingReservations: number;
  totalSpentTl: number;
  totalSpentUsd: number;
  totalGuests: number;
  firstReservationDate: string;
  lastReservationDate: string;
  firstCreatedDate: string;
  lastCreatedDate: string;
  activities: string[];
  lastActivityName: string | null;
};

type SortField = "customerName" | "totalReservations" | "totalSpentTl" | "lastReservationDate" | "totalGuests";
type SortDir = "asc" | "desc";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastReservationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [minReservations, setMinReservations] = useState<string>("");
  const [minSpent, setMinSpent] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const allActivities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => c.activities.forEach(a => set.add(a)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [customers]);

  const hasActiveFilters = activityFilter !== "all" || minReservations !== "" || minSpent !== "" || dateFrom !== "" || dateTo !== "";

  const clearFilters = () => {
    setActivityFilter("all");
    setMinReservations("");
    setMinSpent("");
    setDateFrom("");
    setDateTo("");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let result = customers;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.includes(q) ||
        (c.customerEmail && c.customerEmail.toLowerCase().includes(q)) ||
        c.activities.some(a => a.toLowerCase().includes(q))
      );
    }

    if (activityFilter !== "all") {
      result = result.filter(c => c.activities.includes(activityFilter));
    }
    if (minReservations) {
      const min = parseInt(minReservations);
      if (!isNaN(min)) result = result.filter(c => c.totalReservations >= min);
    }
    if (minSpent) {
      const min = parseInt(minSpent);
      if (!isNaN(min)) result = result.filter(c => c.totalSpentTl >= min);
    }
    if (dateFrom) {
      result = result.filter(c => c.lastReservationDate >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(c => c.firstReservationDate <= dateTo);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "customerName":
          cmp = a.customerName.localeCompare(b.customerName, "tr");
          break;
        case "totalReservations":
          cmp = a.totalReservations - b.totalReservations;
          break;
        case "totalSpentTl":
          cmp = a.totalSpentTl - b.totalSpentTl;
          break;
        case "lastReservationDate":
          cmp = a.lastReservationDate.localeCompare(b.lastReservationDate);
          break;
        case "totalGuests":
          cmp = a.totalGuests - b.totalGuests;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [customers, search, sortField, sortDir, activityFilter, minReservations, minSpent, dateFrom, dateTo]);

  const stats = useMemo(() => {
    return {
      total: customers.length,
      totalReservations: customers.reduce((s, c) => s + c.totalReservations, 0),
      totalRevenueTl: customers.reduce((s, c) => s + c.totalSpentTl, 0),
      repeatCustomers: customers.filter(c => c.totalReservations > 1).length,
    };
  }, [customers]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + "T00:00:00"), "dd MMM yyyy", { locale: tr });
    } catch {
      return dateStr;
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <span
      className="flex items-center gap-1 cursor-pointer select-none font-medium"
      onClick={() => toggleSort(field)}
      data-testid={`sort-${field}`}
    >
      {children}
      <ArrowUpDown className="h-3 w-3 opacity-50" />
    </span>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 xl:ml-64 p-4 pt-16 xl:pt-20 xl:px-8 xl:pb-8 pb-24 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Musteriler</h1>
        <Badge variant="secondary" data-testid="text-customer-count">{stats.total} musteri</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              <span>Toplam Musteri</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-total">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Ticket className="h-4 w-4" />
              <span>Toplam Rezervasyon</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-reservations">{stats.totalReservations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>Toplam Gelir (TL)</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-revenue">{stats.totalRevenueTl.toLocaleString("tr-TR")} TL</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              <span>Tekrar Eden</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-repeat">{stats.repeatCustomers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Musteri ara (isim, telefon, e-posta)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-customers"
          />
        </div>

        {/* Mobile Filters */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "outline"} size="icon" data-testid="button-mobile-filter">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl">
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtreler
                </SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Aktivite</Label>
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger className="w-full h-12" data-testid="select-activity-filter-mobile">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Aktiviteler</SelectItem>
                      {allActivities.map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tarih Araligi (Aktivite Tarihi)</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-12" data-testid="input-date-from-mobile" />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-12" data-testid="input-date-to-mobile" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Min. Rezervasyon Sayisi</Label>
                  <Input type="number" placeholder="ornek: 2" value={minReservations} onChange={(e) => setMinReservations(e.target.value)} className="h-12" data-testid="input-min-reservations-mobile" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Min. Harcama (TL)</Label>
                  <Input type="number" placeholder="ornek: 500" value={minSpent} onChange={(e) => setMinSpent(e.target.value)} className="h-12" data-testid="input-min-spent-mobile" />
                </div>
                <Button variant="outline" className="w-full h-12 mt-2" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Filtreleri Temizle
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-2">
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-activity-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Aktiviteler</SelectItem>
              {allActivities.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "outline"} size="sm" data-testid="button-advanced-filters">
                <Filter className="h-4 w-4 mr-1" />
                Filtreler
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <div className="font-medium text-sm">Gelismis Filtreler</div>
                <div className="space-y-2">
                  <Label className="text-xs">Tarih Araligi (Aktivite Tarihi)</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8" data-testid="input-date-from" />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8" data-testid="input-date-to" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Min. Rezervasyon Sayisi</Label>
                  <Input type="number" placeholder="ornek: 2" value={minReservations} onChange={(e) => setMinReservations(e.target.value)} className="h-8" data-testid="input-min-reservations" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Min. Harcama (TL)</Label>
                  <Input type="number" placeholder="ornek: 500" value={minSpent} onChange={(e) => setMinSpent(e.target.value)} className="h-8" data-testid="input-min-spent" />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Filtreleri Temizle
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">{filtered.length} sonuc</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Yukleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {(search || hasActiveFilters) ? "Arama ve filtre kriterlerine uygun musteri bulunamadi." : "Henuz musteri kaydi yok. Rezervasyon olusturdukca musteriler burada gorunecek."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortButton field="customerName">Musteri</SortButton></TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead className="text-center"><SortButton field="totalReservations">Rez. Sayisi</SortButton></TableHead>
                    <TableHead className="text-center"><SortButton field="totalGuests">Kisi</SortButton></TableHead>
                    <TableHead className="text-right"><SortButton field="totalSpentTl">Toplam (TL)</SortButton></TableHead>
                    <TableHead><SortButton field="lastReservationDate">Aktivite Tarihi</SortButton></TableHead>
                    <TableHead>Oluşturma Tarihi</TableHead>
                    <TableHead>Aktiviteler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.customerPhone}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedCustomer(c)}
                      data-testid={`row-customer-${c.customerPhone}`}
                    >
                      <TableCell className="font-medium">{c.customerName}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {c.customerPhone}
                        </span>
                      </TableCell>
                      <TableCell>
                        {c.customerEmail ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {c.customerEmail}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.totalReservations > 1 ? "default" : "secondary"}>
                          {c.totalReservations}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{c.totalGuests}</TableCell>
                      <TableCell className="text-right font-medium">{c.totalSpentTl.toLocaleString("tr-TR")}</TableCell>
                      <TableCell className="text-sm">{formatDate(c.lastReservationDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(c.lastCreatedDate)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {c.activities.slice(0, 2).map((a) => (
                            <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                          ))}
                          {c.activities.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{c.activities.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-customer-detail-name">{selectedCustomer?.customerName}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCustomer.customerPhone}</span>
                </div>
                {selectedCustomer.customerEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCustomer.customerEmail}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Rezervasyon</p>
                  <p className="text-lg font-bold" data-testid="text-detail-total-rez">{selectedCustomer.totalReservations}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Kisi</p>
                  <p className="text-lg font-bold">{selectedCustomer.totalGuests}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Onaylanan</p>
                  <p className="text-lg font-bold text-green-600">{selectedCustomer.confirmedReservations}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Iptal</p>
                  <p className="text-lg font-bold text-red-600">{selectedCustomer.cancelledReservations}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bekleyen</p>
                  <p className="text-lg font-bold text-yellow-600">{selectedCustomer.pendingReservations}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam (TL)</p>
                  <p className="text-lg font-bold">{selectedCustomer.totalSpentTl.toLocaleString("tr-TR")} TL</p>
                </div>
              </div>

              {selectedCustomer.totalSpentUsd > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Toplam (USD)</p>
                  <p className="text-lg font-bold">${selectedCustomer.totalSpentUsd.toLocaleString("en-US")}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Aktivite Tarihi</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Ilk: {formatDate(selectedCustomer.firstReservationDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Son: {formatDate(selectedCustomer.lastReservationDate)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Oluşturma Tarihi</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Ilk: {formatDate(selectedCustomer.firstCreatedDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Son: {formatDate(selectedCustomer.lastCreatedDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Katildigi Aktiviteler</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCustomer.activities.map((a) => (
                    <Badge key={a} variant="outline">{a}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
