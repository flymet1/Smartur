import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions, PERMISSION_KEYS } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit,
  CreditCard,
  Calendar,
  Umbrella,
  UserCheck,
  TableProperties,
  Send,
  RefreshCw,
  ArrowRightLeft,
  Euro,
  Banknote,
  Calculator,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Building2,
  Phone,
  FileText,
  Download,
  FileSpreadsheet,
  Handshake,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Scale,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Package,
  Clock
} from "lucide-react";
import type { Agency, AgencyPayout, SupplierDispatch, Activity, AgencyActivityRate, SupplierDispatchItem } from "@shared/schema";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, ChevronsUpDown } from "lucide-react";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

const formatDateTR = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return format(date, 'd MMMM yyyy', { locale: tr });
  } catch {
    return dateStr;
  }
};

const formatDateShortTR = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return format(date, 'dd.MM.yyyy', { locale: tr });
  } catch {
    return dateStr;
  }
};

// Excel export fonksiyonu (CSV formatında)
const exportToExcel = (
  dispatches: SupplierDispatch[],
  suppliers: Agency[],
  activities: Activity[],
  startDate: string,
  endDate: string
) => {
  const headers = ['Tarih', 'Saat', 'Acenta', 'Müşteri Adı', 'Aktivite', 'Misafir', 'Birim Fiyat', 'Toplam', 'Para Birimi', 'Notlar'];
  const rows = dispatches.map(d => {
    const supplier = suppliers.find(s => s.id === d.agencyId);
    const activity = activities.find(a => a.id === d.activityId);
    const curr = d.currency || 'TRY';
    const unitPrice = d.unitPayoutTl || 0;
    const totalPrice = d.totalPayoutTl || 0;
    return [
      formatDateShortTR(d.dispatchDate),
      d.dispatchTime || '',
      supplier?.name || '',
      d.customerName || '',
      activity?.name || '',
      d.guestCount || 0,
      curr === 'USD' ? `$${unitPrice}` : `${unitPrice} TL`,
      curr === 'USD' ? `$${totalPrice}` : `${totalPrice} TL`,
      curr,
      d.notes || ''
    ];
  });

  // Özet satırları
  const totalTRY = dispatches.filter(d => d.currency !== 'USD').reduce((sum, d) => sum + (d.totalPayoutTl || 0), 0);
  const totalUSD = dispatches.filter(d => d.currency === 'USD').reduce((sum, d) => sum + (d.totalPayoutTl || 0), 0);
  const totalGuests = dispatches.reduce((sum, d) => sum + (d.guestCount || 0), 0);
  
  rows.push(['', '', '', '', '', '', '', '', '', '']);
  rows.push(['ÖZET', '', '', '', '', `${totalGuests} kişi`, '', '', '', '']);
  if (totalTRY > 0) rows.push(['Toplam TL', '', '', '', '', '', '', `${totalTRY.toLocaleString('tr-TR')} TL`, 'TRY', '']);
  if (totalUSD > 0) rows.push(['Toplam USD', '', '', '', '', '', '', `$${totalUSD.toLocaleString('en-US')}`, 'USD', '']);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `gönderimler_${startDate}_${endDate}.csv`;
  link.click();
};

// PDF export fonksiyonu (yazdırılabilir HTML)
const exportToPDF = (
  dispatches: SupplierDispatch[],
  suppliers: Agency[],
  activities: Activity[],
  startDate: string,
  endDate: string
) => {
  const totalTRY = dispatches.filter(d => d.currency !== 'USD').reduce((sum, d) => sum + (d.totalPayoutTl || 0), 0);
  const totalUSD = dispatches.filter(d => d.currency === 'USD').reduce((sum, d) => sum + (d.totalPayoutTl || 0), 0);
  const totalGuests = dispatches.reduce((sum, d) => sum + (d.guestCount || 0), 0);

  const tableRows = dispatches.map(d => {
    const supplier = suppliers.find(s => s.id === d.agencyId);
    const activity = activities.find(a => a.id === d.activityId);
    const priceFormatted = d.currency === 'USD' 
      ? `$${(d.totalPayoutTl || 0).toLocaleString('en-US')}`
      : `${(d.totalPayoutTl || 0).toLocaleString('tr-TR')} TL`;
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${d.dispatchDate || ''}</td>
      <td style="padding:8px;border:1px solid #ddd;">${d.dispatchTime || ''}</td>
      <td style="padding:8px;border:1px solid #ddd;">${supplier?.name || ''}</td>
      <td style="padding:8px;border:1px solid #ddd;">${d.customerName || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${activity?.name || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${d.guestCount || 0}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${priceFormatted}</td>
    </tr>`;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Gönderim Raporu</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; font-size: 24px; margin-bottom: 10px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
        .totals { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
        .totals span { margin-right: 30px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <h1>Gönderim Raporu</h1>
      <div class="meta">
        <strong>Dönem:</strong> ${formatDateShortTR(startDate)} - ${formatDateShortTR(endDate)}<br>
        <strong>Toplam Kayıt:</strong> ${dispatches.length}
      </div>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Saat</th>
            <th>Acenta</th>
            <th>Müşteri</th>
            <th>Aktivite</th>
            <th style="text-align:center;">Misafir</th>
            <th style="text-align:right;">Toplam</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="totals">
        <strong>Özet:</strong>
        <span>${totalGuests} misafir</span>
        ${totalTRY > 0 ? `<span>${totalTRY.toLocaleString('tr-TR')} TL</span>` : ''}
        ${totalUSD > 0 ? `<span>$${totalUSD.toLocaleString('en-US')}</span>` : ''}
      </div>
      <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 20px;cursor:pointer;">Yazdır / PDF</button>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};

// Payouts Excel export
const exportPayoutsToExcel = (payouts: AgencyPayout[], suppliers: Agency[]) => {
  const headers = ['Dönem Başlangıç', 'Dönem Bitiş', 'Acenta', 'Açıklama', 'Misafir', 'Tutar', 'Durum', 'Yöntem'];
  const rows = payouts.map(p => {
    const supplier = suppliers.find(s => s.id === p.agencyId);
    return [
      formatDateShortTR(p.periodStart),
      formatDateShortTR(p.periodEnd),
      supplier?.name || '',
      p.description || '',
      p.guestCount || 0,
      `${(p.totalAmountTl || 0).toLocaleString('tr-TR')} TL`,
      p.status === 'paid' ? 'Ödendi' : 'Beklemede',
      p.method === 'cash' ? 'Nakit' : p.method === 'bank' ? 'Banka' : p.method
    ];
  });
  const total = payouts.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0);
  rows.push(['', '', '', '', '', '', '', '']);
  rows.push(['TOPLAM', '', '', '', '', `${total.toLocaleString('tr-TR')} TL`, '', '']);
  const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ödemeler_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Payouts PDF export
const exportPayoutsToPDF = (payouts: AgencyPayout[], suppliers: Agency[]) => {
  const total = payouts.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0);
  const tableRows = payouts.map(p => {
    const supplier = suppliers.find(s => s.id === p.agencyId);
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${formatDateShortTR(p.periodStart)} - ${formatDateShortTR(p.periodEnd)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${supplier?.name || ''}</td>
      <td style="padding:8px;border:1px solid #ddd;">${p.description || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${p.guestCount || 0}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${(p.totalAmountTl || 0).toLocaleString('tr-TR')} TL</td>
      <td style="padding:8px;border:1px solid #ddd;">${p.status === 'paid' ? 'Ödendi' : 'Beklemede'}</td>
    </tr>`;
  }).join('');
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ödeme Raporu</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#333;font-size:24px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f5f5f5;padding:10px;border:1px solid #ddd;text-align:left}.totals{margin-top:20px;padding:15px;background:#f9f9f9;border-radius:8px}@media print{.no-print{display:none}}</style></head><body><h1>Ödeme Raporu</h1><div>Toplam: ${payouts.length} kayıt</div><table><thead><tr><th>Dönem</th><th>Acenta</th><th>Açıklama</th><th>Misafir</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>${tableRows}</tbody></table><div class="totals"><strong>Toplam:</strong> ${total.toLocaleString('tr-TR')} TL</div><button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 20px;cursor:pointer;">Yazdır / PDF</button></body></html>`;
  const printWindow = window.open('', '_blank');
  if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); }
};

// Rates Excel export
const exportRatesToExcel = (rates: AgencyActivityRate[], suppliers: Agency[], activities: Activity[]) => {
  const headers = ['Acenta', 'Aktivite', 'Geçerlilik Başlangıç', 'Geçerlilik Bitiş', 'Birim Fiyat', 'Para Birimi', 'Notlar'];
  const rows = rates.map(r => {
    const supplier = suppliers.find(s => s.id === r.agencyId);
    const activity = activities.find(a => a.id === r.activityId);
    const price = r.currency === 'USD' ? (r.unitPayoutUsd || 0) : (r.unitPayoutTl || 0);
    return [supplier?.name || '', activity?.name || '', formatDateShortTR(r.validFrom), formatDateShortTR(r.validTo), price, r.currency, r.notes || ''];
  });
  const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `fiyat_tablosu_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Rates PDF export
const exportRatesToPDF = (rates: AgencyActivityRate[], suppliers: Agency[], activities: Activity[]) => {
  const tableRows = rates.map(r => {
    const supplier = suppliers.find(s => s.id === r.agencyId);
    const activity = activities.find(a => a.id === r.activityId);
    const price = r.currency === 'USD' ? `$${r.unitPayoutUsd || 0}` : `${r.unitPayoutTl || 0} TL`;
    return `<tr><td style="padding:8px;border:1px solid #ddd;">${supplier?.name || ''}</td><td style="padding:8px;border:1px solid #ddd;">${activity?.name || ''}</td><td style="padding:8px;border:1px solid #ddd;">${formatDateShortTR(r.validFrom)} - ${formatDateShortTR(r.validTo)}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${price}</td></tr>`;
  }).join('');
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiyat Tablosu</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#333;font-size:24px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f5f5f5;padding:10px;border:1px solid #ddd;text-align:left}@media print{.no-print{display:none}}</style></head><body><h1>Fiyat Tablosu</h1><div>Toplam: ${rates.length} kayıt</div><table><thead><tr><th>Acenta</th><th>Aktivite</th><th>Geçerlilik</th><th>Birim Fiyat</th></tr></thead><tbody>${tableRows}</tbody></table><button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 20px;cursor:pointer;">Yazdır / PDF</button></body></html>`;
  const printWindow = window.open('', '_blank');
  if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); }
};

// Partner Transactions Excel export
const exportPartnerTransactionsToExcel = (transactions: any[]) => {
  const headers = ['Müşteri', 'Partner', 'Yön', 'Tarih', 'Aktivite', 'Misafir', 'Birim Fiyat', 'Toplam', 'Para Birimi', 'Durum'];
  const rows = transactions.map(tx => {
    const isSender = tx.currentTenantId === tx.senderTenantId;
    const partnerName = isSender ? tx.receiverTenantName : tx.senderTenantName;
    const direction = isSender ? 'Gönderildi' : 'Alındı';
    return [tx.customerName, partnerName || 'Partner', direction, formatDateShortTR(tx.transactionDate), tx.activityName || '', tx.guestCount, tx.unitPrice || 0, tx.totalAmount || 0, tx.currency, tx.status === 'pending' ? 'Beklemede' : tx.status === 'confirmed' ? 'Onaylandı' : 'İptal'];
  });
  const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `partner_musteriler_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Partner Transactions PDF export
const exportPartnerTransactionsToPDF = (transactions: any[]) => {
  const tableRows = transactions.map(tx => {
    const isSender = tx.currentTenantId === tx.senderTenantId;
    const partnerName = isSender ? tx.receiverTenantName : tx.senderTenantName;
    const direction = isSender ? 'Gönderildi' : 'Alındı';
    const price = tx.totalAmount ? `${tx.totalAmount} ${tx.currency}` : `${tx.unitPrice || 0} ${tx.currency}/kişi`;
    return `<tr><td style="padding:8px;border:1px solid #ddd;">${tx.customerName}</td><td style="padding:8px;border:1px solid #ddd;">${partnerName || 'Partner'}</td><td style="padding:8px;border:1px solid #ddd;">${direction}</td><td style="padding:8px;border:1px solid #ddd;">${formatDateShortTR(tx.transactionDate)}</td><td style="padding:8px;border:1px solid #ddd;">${tx.activityName || '-'}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;">${tx.guestCount}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${price}</td></tr>`;
  }).join('');
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Partner Acentalar</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#333;font-size:24px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f5f5f5;padding:10px;border:1px solid #ddd;text-align:left}@media print{.no-print{display:none}}</style></head><body><h1>Partner Acentalar</h1><div>Toplam: ${transactions.length} kayıt</div><table><thead><tr><th>Müşteri</th><th>Partner</th><th>Yön</th><th>Tarih</th><th>Aktivite</th><th>Misafir</th><th>Tutar</th></tr></thead><tbody>${tableRows}</tbody></table><button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 20px;cursor:pointer;">Yazdır / PDF</button></body></html>`;
  const printWindow = window.open('', '_blank');
  if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); }
};

export default function Finance() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canManageAgencies = hasPermission(PERMISSION_KEYS.FINANCE_MANAGE);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    // Ay sonunu varsayılan olarak ayarla (gelecek gönderimler de görünsün)
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDayOfMonth.toISOString().split('T')[0];
  });
  
  // Dinamik partner logo için sidebarLogo
  const { data: logoSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'sidebarLogo'],
  });
  const partnerLogoUrl = logoSetting?.value;
  
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [agencyDialogOpen, setAgencyDialogOpen] = useState(false);
  const [agencyForm, setAgencyForm] = useState({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
  const [editingRate, setEditingRate] = useState<AgencyActivityRate | null>(null);
  const [payoutForm, setPayoutForm] = useState({
    agencyId: 0,
    periodStart: startDate,
    periodEnd: endDate,
    description: '',
    guestCount: 0,
    baseAmountTl: 0,
    vatRatePct: 0,
    method: 'cash',
    reference: '',
    notes: '',
    status: 'paid'
  });
  // Dispatch item type
  type DispatchItemForm = {
    itemType: 'base' | 'observer' | 'extra';
    label: string;
    quantity: number;
    unitAmount: number;
    currency: 'TRY' | 'USD';
  };
  const defaultDispatchItem: DispatchItemForm = { itemType: 'extra', label: '', quantity: 1, unitAmount: 0, currency: 'TRY' };
  
  const [dispatchForm, setDispatchForm] = useState({
    agencyId: 0,
    activityId: 0,
    dispatchDate: new Date().toISOString().split('T')[0],
    dispatchTime: '10:00',
    customerName: '',
    notes: '',
    items: [{ ...defaultDispatchItem }] as DispatchItemForm[]
  });
  const [useLineItems, setUseLineItems] = useState(false);
  // Basit mod için geri uyumluluk
  const [simpleGuestCount, setSimpleGuestCount] = useState(1);
  const [simpleUnitPayout, setSimpleUnitPayout] = useState(0);
  const [simpleCurrency, setSimpleCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [rateForm, setRateForm] = useState({
    agencyId: 0,
    activityId: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    unitPayoutTl: 0,
    unitPayoutUsd: 0,
    currency: 'TRY',
    notes: ''
  });

  // Partner payment rejection dialog state
  const [rejectPaymentDialogOpen, setRejectPaymentDialogOpen] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Dispatch filter states
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [financeTab, setFinanceTab] = useState<'dispatches' | 'payouts' | 'rates' | 'partner-customers' | 'agencies'>('dispatches');
  const [dispatchSortOrder, setDispatchSortOrder] = useState<'createdNewest' | 'createdOldest' | 'dateNewest' | 'dateOldest'>('createdNewest');
  const [payoutSortOrder, setPayoutSortOrder] = useState<'createdNewest' | 'createdOldest' | 'amountHigh' | 'amountLow'>('createdNewest');
  const [rateSortOrder, setRateSortOrder] = useState<'createdNewest' | 'createdOldest' | 'priceHigh' | 'priceLow'>('createdNewest');
  const [partnerSortOrder, setPartnerSortOrder] = useState<'createdNewest' | 'createdOldest' | 'dateNewest' | 'dateOldest'>('createdNewest');
  const [datePreset, setDatePreset] = useState<string>('this-month');

  // Exchange Rates
  type ExchangeRates = {
    USD: { TRY: number; EUR: number };
    EUR: { TRY: number; USD: number };
    TRY: { USD: number; EUR: number };
    lastUpdated: string;
    date: string;
    stale?: boolean;
  };
  const { data: exchangeRates, isLoading: ratesLoading, refetch: refetchRates } = useQuery<ExchangeRates>({
    queryKey: ['/api/finance/exchange-rates'],
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 60, // 1 hour
  });

  // Convert currency (used for dispatch calculations)
  const convertCurrency = (amount: number, from: string, to: string): number => {
    if (!exchangeRates || from === to) return amount;
    const fromRates = exchangeRates[from as keyof typeof exchangeRates];
    if (typeof fromRates === 'object' && to in fromRates) {
      return amount * (fromRates as Record<string, number>)[to];
    }
    return amount;
  };

  // Tedarikçiler (Suppliers)
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Agency[]>({
    queryKey: ['/api/finance/agencies']
  });

  // Ödemeler
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<AgencyPayout[]>({
    queryKey: ['/api/finance/payouts']
  });

  // Gönderimler (Dispatches)
  const { data: dispatches = [] } = useQuery<SupplierDispatch[]>({
    queryKey: ['/api/finance/dispatches']
  });

  // Genişletilmiş dispatch'ler için state ve item'ları tutmak
  const [expandedDispatchIds, setExpandedDispatchIds] = useState<Set<number>>(new Set());
  const [dispatchItemsMap, setDispatchItemsMap] = useState<Record<number, SupplierDispatchItem[]>>({});
  const [loadingItemsFor, setLoadingItemsFor] = useState<Set<number>>(new Set());

  // Genişletilmiş partner transaction'lar için state
  const [expandedPartnerTxIds, setExpandedPartnerTxIds] = useState<Set<number>>(new Set());

  const togglePartnerTxExpand = (txId: number) => {
    setExpandedPartnerTxIds(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  // Dispatch item'ları yükle (on-demand)
  const loadDispatchItems = async (dispatchId: number) => {
    if (dispatchItemsMap[dispatchId] || loadingItemsFor.has(dispatchId)) return;
    setLoadingItemsFor(prev => new Set(prev).add(dispatchId));
    try {
      const response = await fetch('/api/finance/dispatch-items/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dispatchIds: [dispatchId] })
      });
      if (!response.ok) throw new Error('Failed to fetch items');
      const items = await response.json();
      setDispatchItemsMap(prev => ({ ...prev, [dispatchId]: items || [] }));
    } catch {
      setDispatchItemsMap(prev => ({ ...prev, [dispatchId]: [] }));
    } finally {
      setLoadingItemsFor(prev => {
        const next = new Set(prev);
        next.delete(dispatchId);
        return next;
      });
    }
  };

  const toggleDispatchExpand = (dispatchId: number) => {
    setExpandedDispatchIds(prev => {
      const next = new Set(prev);
      if (next.has(dispatchId)) {
        next.delete(dispatchId);
      } else {
        next.add(dispatchId);
        loadDispatchItems(dispatchId);
      }
      return next;
    });
  };

  // Gönderim Özeti (Dispatch Summary)
  type DispatchSummary = {
    agencyId: number;
    agencyName: string;
    totalGuests: number;
    totalOwedTl: number;
    totalOwedUsd: number;
    totalPaidTl: number;
    remainingTl: number;
  };
  const { data: dispatchSummary = [] } = useQuery<DispatchSummary[]>({
    queryKey: [`/api/finance/dispatches/summary?startDate=${startDate}&endDate=${endDate}`]
  });

  // Aktiviteler
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  // Tarifeler
  const { data: rates = [] } = useQuery<AgencyActivityRate[]>({
    queryKey: ['/api/finance/rates']
  });

  // Partner Transactions state
  const [partnerTransactionRole, setPartnerTransactionRole] = useState<'all' | 'sender' | 'receiver'>('all');
  
  // Partner Mutabakat state
  const [partnerDateRange, setPartnerDateRange] = useState<'week' | 'month' | 'custom'>('week');
  const [partnerStartDate, setPartnerStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [partnerEndDate, setPartnerEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  
  // Partner Transactions interface
  interface PartnerTransaction {
    id: number;
    senderTenantId: number;
    receiverTenantId: number;
    activityId: number;
    reservationId: number | null;
    customerName: string;
    guestCount: number;
    unitPrice: number | null;
    totalAmount: number | null;
    currency: string;
    transactionDate: string;
    status: string;
    notes: string | null;
    createdAt: string | null;
    senderTenantName?: string;
    receiverTenantName?: string;
    activityName?: string;
    currentTenantId?: number;
    paymentCollectionType?: string;
    amountCollectedBySender?: number;
    amountDueToReceiver?: number;
    balanceOwed?: number;
    deletionStatus?: string | null;
    deletionRequestedAt?: string | null;
    deletionRequestedByTenantId?: number | null;
    deletionRejectionReason?: string | null;
  }
  
  // Partner Transactions query - use array pattern for proper cache invalidation
  const { data: partnerTransactions = [], isLoading: isLoadingPartnerTransactions } = useQuery<PartnerTransaction[]>({
    queryKey: ['/api/partner-transactions', partnerTransactionRole],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/partner-transactions?role=${partnerTransactionRole}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Partner Payments interface
  interface PartnerPayment {
    id: number;
    agencyId: number;
    partnerTenantId: number;
    partnerName: string;
    totalAmountTl: number;
    createdAt: string;
    periodStart?: string;
    periodEnd?: string;
    notes?: string;
    direction?: 'outgoing' | 'incoming'; // outgoing = we paid, incoming = we received
    fromTenantId?: number;
    toTenantId?: number;
    confirmationStatus?: 'pending' | 'confirmed' | 'rejected';
    confirmedByTenantId?: number;
    confirmedAt?: string;
    rejectionReason?: string;
    method?: string;
    reference?: string;
    description?: string;
  }

  // Partner Payments query - ödemeleri al
  const { data: partnerPayments = [] } = useQuery<PartnerPayment[]>({
    queryKey: ['/api/partner-payments'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/partner-payments');
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Partner Mutabakat hesaplamaları
  const handlePartnerDateRangeChange = (range: 'week' | 'month' | 'custom') => {
    setPartnerDateRange(range);
    const today = new Date();
    if (range === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setPartnerStartDate(weekAgo.toISOString().split('T')[0]);
      setPartnerEndDate(today.toISOString().split('T')[0]);
    } else if (range === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setPartnerStartDate(monthAgo.toISOString().split('T')[0]);
      setPartnerEndDate(today.toISOString().split('T')[0]);
    }
  };

  // Tarih ve partner filtrelenmiş işlemler
  const filteredPartnerTransactions = partnerTransactions.filter(tx => {
    if (tx.transactionDate < partnerStartDate || tx.transactionDate > partnerEndDate) return false;
    if (selectedPartnerId) {
      const partnerId = tx.currentTenantId === tx.senderTenantId ? tx.receiverTenantId : tx.senderTenantId;
      if (partnerId !== selectedPartnerId) return false;
    }
    return true;
  });

  // Benzersiz partner listesi - önce bağlı partner acentalardan, sonra işlemlerden
  // isSmartUser = true olan acentalar partner acentalardır
  const partnerAgencies = suppliers.filter(s => s.isSmartUser && s.partnerTenantId);
  
  // Partner listesini agencies'den al (işlem olmasa bile görünsün)
  const uniquePartners = partnerAgencies.length > 0
    ? partnerAgencies.map(a => ({ id: a.partnerTenantId!, name: a.name }))
    : Array.from(
        new Map(
          partnerTransactions.map(tx => {
            const isSender = tx.currentTenantId === tx.senderTenantId;
            const partnerId = isSender ? tx.receiverTenantId : tx.senderTenantId;
            const partnerName = isSender ? tx.receiverTenantName : tx.senderTenantName;
            return [partnerId, { id: partnerId, name: partnerName || 'Partner' }];
          })
        ).values()
      );

  // Tarih ve partner filtrelenmiş ödemeler
  const filteredPartnerPayments = partnerPayments.filter(p => {
    // Tarih aralığı filtresi (createdAt veya periodStart/periodEnd)
    const paymentDate = p.createdAt?.split('T')[0] || '';
    if (paymentDate < partnerStartDate || paymentDate > partnerEndDate) return false;
    // Partner filtresi
    if (selectedPartnerId && p.partnerTenantId !== selectedPartnerId) return false;
    return true;
  });

  // Toplam partner ödemeleri - ayrı ayrı hesapla (outgoing: biz ödedik, incoming: bize ödendi)
  const outgoingPartnerPayments = filteredPartnerPayments.filter(p => p.direction === 'outgoing');
  const incomingPartnerPayments = filteredPartnerPayments.filter(p => p.direction === 'incoming');
  const totalOutgoingPayments = outgoingPartnerPayments.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0);
  const totalIncomingPayments = incomingPartnerPayments.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0);

  // Mutabakat özeti hesaplama
  // balanceOwed: sender perspektifinden, pozitif = sender borclu, negatif = sender alacakli
  const partnerReconciliation = {
    sentCount: 0,
    sentGuests: 0,
    sentAmount: 0,
    sentCollected: 0,
    sentBalanceOwed: 0,
    receivedCount: 0,
    receivedGuests: 0,
    receivedAmount: 0,
    receivedCollected: 0,
    receivedBalanceOwed: 0,
    receiverCollectedFromCustomer: 0,
    senderCollectedFromCustomer: 0,
    netBalanceOwed: 0,
    totalPaymentsMade: 0,
    totalPaymentsReceived: 0,
    remainingBalance: 0,
  };

  filteredPartnerTransactions.forEach(tx => {
    const isSender = tx.currentTenantId === tx.senderTenantId;
    const amount = tx.totalAmount || (tx.unitPrice || 0) * tx.guestCount;
    const collected = tx.amountCollectedBySender || 0;
    // balanceOwed: gönderenin alıcıya aktarması gereken para (sender perspektifinden)
    // - receiver_full: 0 (alıcı doğrudan tahsil edecek, gönderen borçlu değil)
    // - sender_full: totalPrice (gönderen tamamını tahsil etti, alıcıya aktarmalı)
    // - sender_partial: amountCollectedBySender (gönderen kısmen tahsil etti)
    const balanceOwedAmount = tx.balanceOwed || 0;
    const collectionType = tx.paymentCollectionType;
    
    if (isSender) {
      partnerReconciliation.sentCount++;
      partnerReconciliation.sentGuests += tx.guestCount;
      partnerReconciliation.sentAmount += amount;
      partnerReconciliation.sentCollected += collected;
      // As sender, we owe balanceOwed to the receiver (the money we collected that belongs to them)
      partnerReconciliation.sentBalanceOwed += balanceOwedAmount;
      // Track what sender collected from customer (sender_full or sender_partial)
      if (collectionType === 'sender_full') {
        partnerReconciliation.senderCollectedFromCustomer += amount;
      } else if (collectionType === 'sender_partial') {
        partnerReconciliation.senderCollectedFromCustomer += collected;
      }
    } else {
      partnerReconciliation.receivedCount++;
      partnerReconciliation.receivedGuests += tx.guestCount;
      partnerReconciliation.receivedAmount += amount;
      partnerReconciliation.receivedCollected += collected;
      // As receiver, they owe us balanceOwed (the money they collected that belongs to us)
      partnerReconciliation.receivedBalanceOwed += balanceOwedAmount;
      // Track what receiver collected from customer (receiver_full or remaining from sender_partial)
      if (collectionType === 'receiver_full') {
        partnerReconciliation.receiverCollectedFromCustomer += amount;
      } else if (collectionType === 'sender_partial') {
        // Receiver collects the remaining amount (totalPrice - amountCollectedBySender)
        partnerReconciliation.receiverCollectedFromCustomer += (amount - collected);
      }
    }
  });
  
  // Net balance: what I owe (as sender) minus what others owe me (as receiver)
  // Positive = I owe more (Siz Borçlusunuz), Negative = I'm owed more (Size Borçlular)
  partnerReconciliation.netBalanceOwed = partnerReconciliation.sentBalanceOwed - partnerReconciliation.receivedBalanceOwed;
  partnerReconciliation.totalPaymentsMade = totalOutgoingPayments; // Biz ödedik
  partnerReconciliation.totalPaymentsReceived = totalIncomingPayments; // Bize ödendi
  // Kalan bakiye hesabı:
  // - Eğer biz borçluysak (net > 0): ödediğimiz kadar azalır (outgoing düşer)
  // - Eğer bize borçlularsa (net < 0): aldığımız kadar azalır (incoming düşer, yani 0'a yaklaşır)
  // Formula: netBalanceOwed - outgoing + incoming
  // Örnek: net=-20000 (bize 20k borç), incoming=7000 → remaining = -20000 + 7000 = -13000 (hala 13k alacak)
  partnerReconciliation.remainingBalance = partnerReconciliation.netBalanceOwed - totalOutgoingPayments + totalIncomingPayments;

  const netBalance = partnerReconciliation.sentAmount - partnerReconciliation.receivedAmount;

  // Tarih aralığına göre filtrelenmiş ve sıralanmış ödemeler (dönem kesişimi)
  const filteredPayouts = payouts.filter(p => {
    // Dönem kesişimi: ödeme dönemi seçili tarih aralığıyla örtüşüyorsa dahil et
    if (p.periodEnd && p.periodEnd < startDate) return false;
    if (p.periodStart && p.periodStart > endDate) return false;
    // Acenta filtresi
    if (selectedAgencyId && p.agencyId !== selectedAgencyId) return false;
    return true;
  }).sort((a, b) => {
    switch (payoutSortOrder) {
      case 'createdNewest': return (b.id || 0) - (a.id || 0);
      case 'createdOldest': return (a.id || 0) - (b.id || 0);
      case 'amountHigh': return (b.totalAmountTl || 0) - (a.totalAmountTl || 0);
      case 'amountLow': return (a.totalAmountTl || 0) - (b.totalAmountTl || 0);
      default: return 0;
    }
  });

  // Acenta filtresine göre filtrelenmiş ve sıralanmış fiyat tablosu
  // Fiyat sıralaması için TRY'ye normalize et (exchange rates kullanarak)
  const getNormalizedPriceTRY = (rate: AgencyActivityRate): number => {
    if (rate.currency === 'USD') {
      const usdAmount = rate.unitPayoutUsd || 0;
      const usdToTry = exchangeRates?.USD?.TRY || 35;
      return usdAmount * usdToTry;
    }
    return rate.unitPayoutTl || 0;
  };
  const filteredRates = rates.filter(r => {
    if (selectedAgencyId && r.agencyId !== selectedAgencyId) return false;
    return true;
  }).sort((a, b) => {
    switch (rateSortOrder) {
      case 'createdNewest': return (b.id || 0) - (a.id || 0);
      case 'createdOldest': return (a.id || 0) - (b.id || 0);
      case 'priceHigh': return getNormalizedPriceTRY(b) - getNormalizedPriceTRY(a);
      case 'priceLow': return getNormalizedPriceTRY(a) - getNormalizedPriceTRY(b);
      default: return 0;
    }
  });

  // Tarih aralığına göre filtrelenmiş ve sıralanmış gönderimler
  const filteredDispatches = dispatches
    .filter(d => {
      if (!d.dispatchDate) return false;
      // Tarih filtresi
      if (d.dispatchDate < startDate || d.dispatchDate > endDate) return false;
      // Acenta filtresi
      if (selectedAgencyId && d.agencyId !== selectedAgencyId) return false;
      return true;
    })
    .sort((a, b) => {
      if (dispatchSortOrder === 'createdNewest' || dispatchSortOrder === 'createdOldest') {
        const createdA = a.createdAt ? new Date(a.createdAt).toISOString() : '';
        const createdB = b.createdAt ? new Date(b.createdAt).toISOString() : '';
        return dispatchSortOrder === 'createdNewest' 
          ? createdB.localeCompare(createdA) 
          : createdA.localeCompare(createdB);
      } else {
        const dateA = a.dispatchDate || '';
        const dateB = b.dispatchDate || '';
        return dispatchSortOrder === 'dateNewest' 
          ? dateB.localeCompare(dateA) 
          : dateA.localeCompare(dateB);
      }
    });

  // Özet hesaplamalar
  const totalGuests = filteredDispatches.reduce((sum, d) => sum + (d.guestCount || 0), 0);
  const totalOwed = filteredDispatches.reduce((sum, d) => sum + (d.totalPayoutTl || 0), 0);
  const totalPaid = filteredPayouts.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0);
  const supplierSummary = suppliers.map(s => {
    const supplierPayouts = filteredPayouts.filter(p => p.agencyId === s.id);
    return {
      ...s,
      guestCount: supplierPayouts.reduce((sum, p) => sum + (p.guestCount || 0), 0),
      totalPaid: supplierPayouts.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0),
      payoutCount: supplierPayouts.length
    };
  });

  // Mutations
  const createPayoutMutation = useMutation({
    mutationFn: async (data: typeof payoutForm) => apiRequest('POST', '/api/finance/payouts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/dispatches/summary'] });
      setPayoutDialogOpen(false);
      setPayoutForm({
        agencyId: 0,
        periodStart: startDate,
        periodEnd: endDate,
        description: '',
        guestCount: 0,
        baseAmountTl: 0,
        vatRatePct: 0,
        method: 'cash',
        reference: '',
        notes: '',
        status: 'paid'
      });
      toast({ title: "Ödeme kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme kaydedilemedi", variant: "destructive" });
    }
  });

  const deletePayoutMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/payouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/dispatches/summary'] });
      toast({ title: "Ödeme silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme silinemedi", variant: "destructive" });
    }
  });

  const createAgencyMutation = useMutation({
    mutationFn: async (data: { name: string; contactInfo: string; defaultPayoutPerGuest: number; notes: string }) => {
      const res = await apiRequest('POST', '/api/finance/agencies', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setAgencyDialogOpen(false);
      setAgencyForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
      toast({ title: "Acenta eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Acenta eklenemedi", variant: "destructive" });
    }
  });

  const confirmPartnerPaymentMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('POST', `/api/partner-payments/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-payments'] });
      toast({ title: "Ödeme onaylandı", description: "Partner ödemesi başarıyla onaylandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme onaylanamadı", variant: "destructive" });
    }
  });

  const rejectPartnerPaymentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => 
      apiRequest('POST', `/api/partner-payments/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-payments'] });
      toast({ title: "Ödeme reddedildi", description: "Partner ödemesi reddedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme reddedilemedi", variant: "destructive" });
    }
  });

  // Basit modda eski API'yi, detaylı modda yeni items API'sini kullanacak
  const createDispatchMutation = useMutation({
    mutationFn: async (data: { simple: boolean; payload: Record<string, unknown> }) => {
      if (data.simple) {
        return apiRequest('POST', '/api/finance/dispatches', data.payload);
      } else {
        return apiRequest('POST', '/api/finance/dispatches-with-items', data.payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/dispatches'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].includes('/api/finance/dispatches/summary')
      });
      setDispatchDialogOpen(false);
      resetDispatchForm();
      toast({ title: "Gönderim kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Gönderim kaydedilemedi", variant: "destructive" });
    }
  });
  
  const resetDispatchForm = () => {
    setDispatchForm({
      agencyId: 0,
      activityId: 0,
      dispatchDate: new Date().toISOString().split('T')[0],
      dispatchTime: '10:00',
      customerName: '',
      notes: '',
      items: [{ ...defaultDispatchItem }]
    });
    setSimpleGuestCount(1);
    setSimpleUnitPayout(0);
    setSimpleCurrency('TRY');
    setUseLineItems(false);
  };

  const deleteDispatchMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/dispatches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/dispatches'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].includes('/api/finance/dispatches/summary')
      });
      toast({ title: "Gönderim silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Gönderim silinemedi", variant: "destructive" });
    }
  });

  const createRateMutation = useMutation({
    mutationFn: async (data: typeof rateForm) => apiRequest('POST', '/api/finance/rates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/rates'] });
      setRateDialogOpen(false);
      setEditingRate(null);
      setRateForm({ agencyId: 0, activityId: 0, validFrom: new Date().toISOString().split('T')[0], validTo: '', unitPayoutTl: 0, unitPayoutUsd: 0, currency: 'TRY', notes: '' });
      toast({ title: "Fiyat kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Fiyat kaydedilemedi", variant: "destructive" });
    }
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof rateForm> }) => 
      apiRequest('PATCH', `/api/finance/rates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/rates'] });
      setRateDialogOpen(false);
      setEditingRate(null);
      toast({ title: "Tarife güncellendi" });
    }
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/rates'] });
      toast({ title: "Tarife silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tarife silinemedi", variant: "destructive" });
    }
  });

  // Partner Transaction Deletion Mutations
  const requestDeletionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/partner-transactions/${id}/request-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Silme talebi gönderildi", description: "Partner acentanın onayı bekleniyor" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Silme talebi gönderilemedi", variant: "destructive" });
    }
  });

  const approveDeletionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/partner-transactions/${id}/approve-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Silme talebi onaylandı", description: "İşlem silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Silme talebi onaylanamadı", variant: "destructive" });
    }
  });

  const rejectDeletionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      return await apiRequest('POST', `/api/partner-transactions/${id}/reject-deletion`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Silme talebi reddedildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Silme talebi reddedilemedi", variant: "destructive" });
    }
  });

  const cancelDeletionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/partner-transactions/${id}/cancel-deletion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-transactions'] });
      toast({ title: "Silme talebi iptal edildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Silme talebi iptal edilemedi", variant: "destructive" });
    }
  });

  const handlePayoutSubmit = () => {
    if (!payoutForm.agencyId) {
      toast({ title: "Hata", description: "Tedarikçi seçin", variant: "destructive" });
      return;
    }
    const vatAmount = Math.round(payoutForm.baseAmountTl * (payoutForm.vatRatePct || 0) / 100);
    const totalAmount = payoutForm.baseAmountTl + vatAmount;
    createPayoutMutation.mutate({
      ...payoutForm,
      vatAmountTl: vatAmount,
      totalAmountTl: totalAmount
    } as any);
  };

  const handleDispatchSubmit = () => {
    if (!dispatchForm.agencyId) {
      toast({ title: "Hata", description: "Tedarikçi seçin", variant: "destructive" });
      return;
    }
    
    if (useLineItems) {
      // Detaylı mod - items API
      const validItems = dispatchForm.items.filter(item => item.label && item.quantity > 0);
      if (validItems.length === 0) {
        toast({ title: "Hata", description: "En az bir kalem ekleyin", variant: "destructive" });
        return;
      }
      createDispatchMutation.mutate({
        simple: false,
        payload: {
          agencyId: dispatchForm.agencyId,
          activityId: dispatchForm.activityId || null,
          dispatchDate: dispatchForm.dispatchDate,
          dispatchTime: dispatchForm.dispatchTime,
          customerName: dispatchForm.customerName || null,
          notes: dispatchForm.notes,
          items: validItems
        }
      });
    } else {
      // Basit mod - eski API
      createDispatchMutation.mutate({
        simple: true,
        payload: {
          agencyId: dispatchForm.agencyId,
          activityId: dispatchForm.activityId || null,
          dispatchDate: dispatchForm.dispatchDate,
          dispatchTime: dispatchForm.dispatchTime,
          customerName: dispatchForm.customerName || null,
          guestCount: simpleGuestCount,
          unitPayoutTl: simpleUnitPayout,
          currency: simpleCurrency,
          notes: dispatchForm.notes
        }
      });
    }
  };

  const handleRateSubmit = () => {
    if (!rateForm.agencyId) {
      toast({ title: "Hata", description: "Tedarikçi seçin", variant: "destructive" });
      return;
    }
    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data: rateForm });
    } else {
      createRateMutation.mutate(rateForm);
    }
  };

  if (suppliersLoading || payoutsLoading) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Finans</h1>
          <p className="text-muted-foreground">Tedarikçi firmalara yapılan ödemeler ve takip</p>
        </div>

        {/* Navigation Menu - Settings style */}
        <div className="border-b bg-background mb-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            <Button
              variant={financeTab === 'dispatches' ? "default" : "ghost"}
              size="sm"
              onClick={() => setFinanceTab('dispatches')}
              data-testid="tab-dispatches"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Gönderilen Müşteri
            </Button>
            <Button
              variant={financeTab === 'payouts' ? "default" : "ghost"}
              size="sm"
              onClick={() => setFinanceTab('payouts')}
              data-testid="tab-payouts"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Ödemeler
            </Button>
            <Button
              variant={financeTab === 'rates' ? "default" : "ghost"}
              size="sm"
              onClick={() => setFinanceTab('rates')}
              data-testid="tab-rates"
            >
              <TableProperties className="h-4 w-4 mr-2" />
              Fiyat Tablosu
            </Button>
            <Button
              variant={financeTab === 'partner-customers' ? "default" : "ghost"}
              size="sm"
              onClick={() => setFinanceTab('partner-customers')}
              data-testid="tab-partner-customers"
            >
              {partnerLogoUrl ? (
                <img src={partnerLogoUrl} alt="Partner" className="h-4 w-4 mr-2 object-contain" />
              ) : (
                <Handshake className="h-4 w-4 mr-2" />
              )}
              Partner Acentalar
            </Button>
            <Button
              variant={financeTab === 'agencies' ? "default" : "ghost"}
              size="sm"
              onClick={() => setFinanceTab('agencies')}
              data-testid="tab-agencies"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Acentalar
            </Button>
          </div>
        </div>

        {/* Tarih Filtreleme - Tüm sekmeler için geçerli */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Dönem Seçimi</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Select 
              value={datePreset}
              onValueChange={(value) => {
                setDatePreset(value);
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                
                if (value === 'today') {
                  setStartDate(today);
                  setEndDate(today);
                } else if (value === 'this-week') {
                  const dayOfWeek = now.getDay();
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  setStartDate(monday.toISOString().split('T')[0]);
                  setEndDate(sunday.toISOString().split('T')[0]);
                } else if (value === 'this-month') {
                  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
                  setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
                } else if (value === 'last-month') {
                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                  setStartDate(lastMonth.toISOString().split('T')[0]);
                  setEndDate(lastMonthEnd.toISOString().split('T')[0]);
                } else if (value === 'last-3-months') {
                  const threeMonthsAgo = new Date(now);
                  threeMonthsAgo.setMonth(now.getMonth() - 3);
                  setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
                  setEndDate(today);
                } else if (value === 'this-year') {
                  setStartDate(`${now.getFullYear()}-01-01`);
                  setEndDate(`${now.getFullYear()}-12-31`);
                } else if (value === 'all-time') {
                  setStartDate('2020-01-01');
                  setEndDate('2030-12-31');
                }
              }}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-date-preset">
                <SelectValue placeholder="Hızlı Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bugün</SelectItem>
                <SelectItem value="this-week">Bu Hafta</SelectItem>
                <SelectItem value="this-month">Bu Ay</SelectItem>
                <SelectItem value="last-month">Geçen Ay</SelectItem>
                <SelectItem value="last-3-months">Son 3 Ay</SelectItem>
                <SelectItem value="this-year">Bu Yıl</SelectItem>
                <SelectItem value="all-time">Tüm Zamanlar</SelectItem>
                <SelectItem value="custom">Özel</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-36"
                data-testid="input-start-date"
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <Input 
              type="date" 
              value={endDate} 
              onChange={e => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-36"
              data-testid="input-end-date"
            />
            {financeTab === 'partner-customers' ? (
              <Select
                value={selectedPartnerId ? String(selectedPartnerId) : "all"}
                onValueChange={(v) => setSelectedPartnerId(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-partner-filter-top">
                  <Handshake className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Tüm Partnerlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Partnerlar</SelectItem>
                  {uniquePartners.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={selectedAgencyId ? String(selectedAgencyId) : "all"}
                onValueChange={(v) => setSelectedAgencyId(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-agency-filter">
                  <Building2 className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Tüm Acentalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Acentalar</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="space-y-4">

          {/* Acenta filtresi aktifken özet göster */}
          {selectedAgencyId && financeTab === 'dispatches' && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{suppliers.find(s => s.id === selectedAgencyId)?.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAgencyId(null)} className="h-6 px-2">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Toplam Misafir:</span>
                    <span className="font-bold">{filteredDispatches.reduce((sum, d) => sum + (d.guestCount || 0), 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Toplam Tutar:</span>
                    <span className="font-bold text-orange-600">
                      {formatMoney(filteredDispatches.reduce((sum, d) => sum + (d.totalPayoutTl || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedAgencyId && financeTab === 'payouts' && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{suppliers.find(s => s.id === selectedAgencyId)?.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAgencyId(null)} className="h-6 px-2">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Toplam Ödeme:</span>
                    <span className="font-bold text-green-600">
                      {formatMoney(filteredPayouts.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Kayıt:</span>
                    <span className="font-bold">{filteredPayouts.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {financeTab === 'dispatches' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Günlük Gönderimler</h3>
              <Button onClick={() => {
                setDispatchForm({
                  agencyId: 0,
                  activityId: 0,
                  dispatchDate: new Date().toISOString().split('T')[0],
                  dispatchTime: '10:00',
                  customerName: '',
                  notes: '',
                  items: [{ ...defaultDispatchItem }]
                });
                setSimpleGuestCount(1);
                setSimpleUnitPayout(0);
                setSimpleCurrency('TRY');
                setUseLineItems(false);
                setDispatchDialogOpen(true);
              }} data-testid="button-add-dispatch">
                <Plus className="h-4 w-4 mr-2" />
                Gönderim Ekle
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">Gönderim Listesi</CardTitle>
                    <Badge variant="outline">{filteredDispatches.length} kayıt</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToExcel(filteredDispatches, suppliers, activities, startDate, endDate)}
                      disabled={filteredDispatches.length === 0}
                      data-testid="button-export-excel"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPDF(filteredDispatches, suppliers, activities, startDate, endDate)}
                      disabled={filteredDispatches.length === 0}
                      data-testid="button-export-pdf"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Select value={dispatchSortOrder} onValueChange={v => setDispatchSortOrder(v as typeof dispatchSortOrder)}>
                      <SelectTrigger className="w-[180px] h-8" data-testid="select-dispatch-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdNewest">
                          <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Ekleme (Yeni)</span>
                        </SelectItem>
                        <SelectItem value="createdOldest">
                          <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Ekleme (Eski)</span>
                        </SelectItem>
                        <SelectItem value="dateNewest">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Tarih (Yeni)</span>
                        </SelectItem>
                        <SelectItem value="dateOldest">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Tarih (Eski)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {filteredDispatches.map(dispatch => {
                    const supplier = suppliers.find(s => s.id === dispatch.agencyId);
                    const activity = activities.find(a => a.id === dispatch.activityId);
                    const isExpanded = expandedDispatchIds.has(dispatch.id);
                    const items = dispatchItemsMap[dispatch.id] || [];
                    const isLoadingItems = loadingItemsFor.has(dispatch.id);
                    const hasItems = items.length > 0;
                    
                    return (
                      <div key={dispatch.id} className="border rounded-lg overflow-visible" data-testid={`row-dispatch-${dispatch.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4 p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleDispatchExpand(dispatch.id)}
                              data-testid={`button-expand-dispatch-${dispatch.id}`}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <div className="min-w-[200px]">
                              <div className="font-medium flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                {supplier?.name || 'Bilinmeyen Acenta'}
                                {dispatch.customerName && (
                                  <span className="text-muted-foreground font-normal">| {dispatch.customerName}</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {formatDateShortTR(dispatch.dispatchDate)} {dispatch.dispatchTime}
                                {activity && ` - ${activity.name}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Misafir:</span>
                              <span className="ml-1 font-medium">{dispatch.guestCount} kişi</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Birim:</span>
                              <span className="ml-1 font-medium">
                                {dispatch.currency === 'USD' 
                                  ? `$${(dispatch.unitPayoutTl || 0).toLocaleString('en-US')}` 
                                  : formatMoney(dispatch.unitPayoutTl || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Toplam:</span>
                              <span className="ml-1 font-medium text-orange-600">
                                {dispatch.currency === 'USD' 
                                  ? `$${(dispatch.totalPayoutTl || 0).toLocaleString('en-US')}` 
                                  : formatMoney(dispatch.totalPayoutTl || 0)}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Bu gönderim kaydını silmek istediğinize emin misiniz?')) {
                                  deleteDispatchMutation.mutate(dispatch.id);
                                }
                              }}
                              data-testid={`button-delete-dispatch-${dispatch.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t bg-muted/30 p-3">
                            {isLoadingItems ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Kalemler yükleniyor...
                              </div>
                            ) : hasItems ? (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  Fiyat Kalemleri
                                </div>
                                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-sm">
                                  <div className="font-medium text-muted-foreground text-xs">Açıklama</div>
                                  <div className="font-medium text-muted-foreground text-xs text-right">Adet</div>
                                  <div className="font-medium text-muted-foreground text-xs text-right">Birim</div>
                                  <div className="font-medium text-muted-foreground text-xs text-right">Toplam</div>
                                  {items.map((item) => (
                                    <div key={item.id} className="contents">
                                      <span>{item.label || '-'}</span>
                                      <span className="text-right">{item.quantity}</span>
                                      <span className="text-right">
                                        {item.currency === 'USD' ? `$${Number(item.unitAmount || 0).toLocaleString('en-US')}` : `${Number(item.unitAmount || 0).toLocaleString('tr-TR')} TL`}
                                      </span>
                                      <span className="text-right font-medium">
                                        {item.currency === 'USD' ? `$${Number(item.totalAmount || 0).toLocaleString('en-US')}` : `${Number(item.totalAmount || 0).toLocaleString('tr-TR')} TL`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Detaylı kalem bilgisi bulunmuyor (basit mod ile oluşturulmuş)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredDispatches.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu dönemde gönderim kaydı bulunamadı
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {financeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold">Ödeme Kayıtları</h3>
                <Badge variant="outline">{filteredPayouts.length} kayıt</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPayoutsToExcel(filteredPayouts, suppliers)}
                  disabled={filteredPayouts.length === 0}
                  data-testid="button-export-payouts-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPayoutsToPDF(filteredPayouts, suppliers)}
                  disabled={filteredPayouts.length === 0}
                  data-testid="button-export-payouts-pdf"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Select value={payoutSortOrder} onValueChange={v => setPayoutSortOrder(v as typeof payoutSortOrder)}>
                  <SelectTrigger className="w-[160px] h-8" data-testid="select-payout-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdNewest">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Ekleme (Yeni)</span>
                    </SelectItem>
                    <SelectItem value="createdOldest">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Ekleme (Eski)</span>
                    </SelectItem>
                    <SelectItem value="amountHigh">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Tutar (Yuksek)</span>
                    </SelectItem>
                    <SelectItem value="amountLow">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Tutar (Dusuk)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => {
                  setPayoutForm({
                    agencyId: 0,
                    periodStart: startDate,
                    periodEnd: endDate,
                    description: '',
                    guestCount: 0,
                    baseAmountTl: 0,
                    vatRatePct: 0,
                    method: 'cash',
                    reference: '',
                    notes: '',
                    status: 'paid'
                  });
                  setPayoutDialogOpen(true);
                }} data-testid="button-add-payout">
                  <Plus className="h-4 w-4 mr-2" />
                  Ödeme Ekle
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {filteredPayouts.map(payout => {
                    const supplier = suppliers.find(s => s.id === payout.agencyId);
                    return (
                      <div key={payout.id} className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded-lg" data-testid={`row-payout-${payout.id}`}>
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-medium flex items-center gap-2">
                            <Umbrella className="h-4 w-4" />
                            {supplier?.name || 'Bilinmeyen Acenta'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateShortTR(payout.periodStart)} - {formatDateShortTR(payout.periodEnd)}
                            {payout.description && ` | ${payout.description}`}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Misafir:</span>
                            <span className="ml-1 font-medium">{payout.guestCount} kişi</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tutar:</span>
                            <span className="ml-1 font-medium text-orange-600">{formatMoney(payout.totalAmountTl || 0)}</span>
                          </div>
                          <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                            {payout.status === 'paid' ? 'Ödendi' : 'Beklemede'}
                          </Badge>
                          <Badge variant="outline">{payout.method === 'cash' ? 'Nakit' : payout.method === 'bank' ? 'Banka' : payout.method}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) {
                                deletePayoutMutation.mutate(payout.id);
                              }
                            }}
                            data-testid={`button-delete-payout-${payout.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPayouts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu dönemde ödeme kaydı bulunamadı
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {financeTab === 'rates' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold">Fiyat Tablosu</h3>
                <Badge variant="outline">{filteredRates.length} kayıt</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportRatesToExcel(filteredRates, suppliers, activities)}
                  disabled={filteredRates.length === 0}
                  data-testid="button-export-rates-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportRatesToPDF(filteredRates, suppliers, activities)}
                  disabled={filteredRates.length === 0}
                  data-testid="button-export-rates-pdf"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Select value={rateSortOrder} onValueChange={v => setRateSortOrder(v as typeof rateSortOrder)}>
                  <SelectTrigger className="w-[160px] h-8" data-testid="select-rate-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdNewest">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Ekleme (Yeni)</span>
                    </SelectItem>
                    <SelectItem value="createdOldest">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Ekleme (Eski)</span>
                    </SelectItem>
                    <SelectItem value="priceHigh">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Fiyat (Yuksek)</span>
                    </SelectItem>
                    <SelectItem value="priceLow">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Fiyat (Dusuk)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => { 
                  setEditingRate(null);
                  setRateForm({ agencyId: 0, activityId: 0, validFrom: new Date().toISOString().split('T')[0], validTo: '', unitPayoutTl: 0, unitPayoutUsd: 0, currency: 'TRY', notes: '' });
                  setRateDialogOpen(true);
                }} data-testid="button-add-rate">
                  <Plus className="h-4 w-4 mr-2" />
                  Fiyat Ekle
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Acenta Fiyat Listesi</CardTitle>
                <CardDescription>
                  Acenta firmalar için dönem bazlı kişi başı ödeme fiyatları. Müşteri gönderiminde bu fiyatlar otomatik uygulanır.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredRates.map(rate => {
                    const supplier = suppliers.find(s => s.id === rate.agencyId);
                    const activity = activities.find(a => a.id === rate.activityId);
                    const isTry = (rate.currency || 'TRY') === 'TRY';
                    const displayAmount = isTry ? (rate.unitPayoutTl || 0) : (rate.unitPayoutUsd || 0);
                    const currencySymbol = isTry ? 'TL' : 'USD';
                    return (
                      <div key={rate.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`card-rate-${rate.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Umbrella className="h-4 w-4" />
                            <span className="font-semibold">{supplier?.name || 'Bilinmeyen'}</span>
                            {activity && <Badge variant="outline">{activity.name}</Badge>}
                            {!activity && <Badge variant="secondary">Genel</Badge>}
                            <Badge variant={isTry ? "default" : "secondary"}>{currencySymbol}</Badge>
                            {!rate.isActive && <Badge variant="destructive">Pasif</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            <Calendar className="h-4 w-4" />
                            {formatDateShortTR(rate.validFrom)} - {rate.validTo ? formatDateShortTR(rate.validTo) : 'Süresiz'}
                          </div>
                          {rate.notes && <p className="text-sm text-muted-foreground mt-1">{rate.notes}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-600" data-testid={`text-rate-amount-${rate.id}`}>
                              {displayAmount.toLocaleString('tr-TR')} {currencySymbol}
                            </div>
                            <div className="text-xs text-muted-foreground">kişi başı</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingRate(rate);
                              setRateForm({
                                agencyId: rate.agencyId,
                                activityId: rate.activityId || 0,
                                validFrom: rate.validFrom,
                                validTo: rate.validTo || '',
                                unitPayoutTl: rate.unitPayoutTl || 0,
                                unitPayoutUsd: rate.unitPayoutUsd || 0,
                                currency: rate.currency || 'TRY',
                                notes: rate.notes || ''
                              });
                              setRateDialogOpen(true);
                            }} data-testid={`button-edit-rate-${rate.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteRateMutation.mutate(rate.id)} data-testid={`button-delete-rate-${rate.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredRates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Henüz fiyat tanımlanmamış
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {financeTab === 'partner-customers' && (
          <div className="space-y-4">
            {/* Partner Mutabakat Özeti */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Partner Mutabakat Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Dönem:</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={partnerDateRange === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePartnerDateRangeChange('week')}
                        data-testid="button-partner-week"
                      >
                        Son 7 Gün
                      </Button>
                      <Button
                        variant={partnerDateRange === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePartnerDateRangeChange('month')}
                        data-testid="button-partner-month"
                      >
                        Son 30 Gün
                      </Button>
                      <Button
                        variant={partnerDateRange === 'custom' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPartnerDateRange('custom')}
                        data-testid="button-partner-custom"
                      >
                        Özel
                      </Button>
                    </div>
                  </div>
                  {partnerDateRange === 'custom' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={partnerStartDate}
                        onChange={e => setPartnerStartDate(e.target.value)}
                        className="h-8 w-[140px]"
                        data-testid="input-partner-start-date"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="date"
                        value={partnerEndDate}
                        onChange={e => setPartnerEndDate(e.target.value)}
                        className="h-8 w-[140px]"
                        data-testid="input-partner-end-date"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      Gönderilen
                    </div>
                    <div className="text-lg font-semibold">
                      {partnerReconciliation.sentGuests} kişi
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {partnerReconciliation.sentCount} işlem • {formatMoney(partnerReconciliation.sentAmount)}
                    </div>
                    {partnerReconciliation.senderCollectedFromCustomer > 0 && (
                      <div className="text-xs text-green-600">
                        Biz tahsil ettik: {formatMoney(partnerReconciliation.senderCollectedFromCustomer)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      Gelen
                    </div>
                    <div className="text-lg font-semibold">
                      {partnerReconciliation.receivedGuests} kişi
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {partnerReconciliation.receivedCount} işlem • {formatMoney(partnerReconciliation.receivedAmount)}
                    </div>
                    {partnerReconciliation.receiverCollectedFromCustomer > 0 && (
                      <div className="text-xs text-green-600">
                        Müşteriden tahsil: {formatMoney(partnerReconciliation.receiverCollectedFromCustomer)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                      Borcumuz
                    </div>
                    <div className={`text-lg font-semibold ${partnerReconciliation.sentBalanceOwed > 0 ? 'text-red-600' : ''}`}>
                      {partnerReconciliation.sentBalanceOwed > 0 ? '-' : ''}{formatMoney(partnerReconciliation.sentBalanceOwed)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Partnerlere ödenecek
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      Alacağımız
                    </div>
                    <div className={`text-lg font-semibold ${partnerReconciliation.receivedBalanceOwed > 0 ? 'text-green-600' : ''}`}>
                      {partnerReconciliation.receivedBalanceOwed > 0 ? '+' : ''}{formatMoney(partnerReconciliation.receivedBalanceOwed)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Partnerlerden alınacak
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Scale className="h-4 w-4 text-purple-500" />
                      Net Durum
                    </div>
                    <div className={`text-lg font-semibold ${partnerReconciliation.netBalanceOwed > 0 ? 'text-red-600' : partnerReconciliation.netBalanceOwed < 0 ? 'text-green-600' : ''}`}>
                      {partnerReconciliation.netBalanceOwed > 0 ? '-' : partnerReconciliation.netBalanceOwed < 0 ? '+' : ''}{formatMoney(Math.abs(partnerReconciliation.netBalanceOwed))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {partnerReconciliation.netBalanceOwed > 0 ? 'Borçlusunuz' : partnerReconciliation.netBalanceOwed < 0 ? 'Alacaklısınız' : 'Denk'}
                    </div>
                  </div>
                </div>
                
                {(partnerReconciliation.totalPaymentsMade > 0 || partnerReconciliation.totalPaymentsReceived > 0 || partnerReconciliation.remainingBalance !== 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 mt-2 border-t border-dashed">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowUpRight className="h-4 w-4 text-orange-500" />
                        Partner Ödemeleri (Ödedik)
                      </div>
                      <div className="text-lg font-semibold text-orange-600">
                        -{formatMoney(partnerReconciliation.totalPaymentsMade)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {outgoingPartnerPayments.length} ödeme
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                        Partner Ödemeleri (Aldık)
                      </div>
                      <div className="text-lg font-semibold text-emerald-600">
                        +{formatMoney(partnerReconciliation.totalPaymentsReceived)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {incomingPartnerPayments.length} ödeme
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wallet className="h-4 w-4 text-purple-500" />
                        Kalan Bakiye
                      </div>
                      <div className={`text-lg font-semibold ${partnerReconciliation.remainingBalance > 0 ? 'text-red-600' : partnerReconciliation.remainingBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {partnerReconciliation.remainingBalance > 0 ? '-' : partnerReconciliation.remainingBalance < 0 ? '+' : ''}{formatMoney(Math.abs(partnerReconciliation.remainingBalance))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {partnerReconciliation.remainingBalance > 0 ? 'Ödenecek' : partnerReconciliation.remainingBalance < 0 ? 'Alacak' : 'Kapandı'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Partner Payments - Onay Bekleyen Ödemeler */}
            {incomingPartnerPayments.filter(p => p.confirmationStatus === 'pending' || !p.confirmationStatus).length > 0 && (
              <Card className="border-amber-400 dark:border-amber-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Onay Bekleyen Partner Ödemeleri
                  </CardTitle>
                  <CardDescription>
                    Partner tarafından gönderildiği bildirilen ödemeler - onaylayın veya reddedin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {incomingPartnerPayments
                      .filter(p => p.confirmationStatus === 'pending' || !p.confirmationStatus)
                      .map(payment => (
                        <div 
                          key={payment.id} 
                          className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800"
                          data-testid={`pending-payment-${payment.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Onay Bekliyor
                              </Badge>
                              <span className="font-medium">{payment.partnerName}</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>
                                <span className="font-medium">{formatMoney(payment.totalAmountTl)}</span>
                                {payment.description && ` - ${payment.description}`}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {payment.periodStart && payment.periodEnd && (
                                  <span>Dönem: {payment.periodStart} - {payment.periodEnd}</span>
                                )}
                                {payment.method && <span>Yöntem: {payment.method}</span>}
                                {payment.reference && <span>Ref: {payment.reference}</span>}
                              </div>
                              {payment.createdAt && (
                                <div className="text-xs">
                                  Bildirim: {new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                              onClick={() => confirmPartnerPaymentMutation.mutate(payment.id)}
                              disabled={confirmPartnerPaymentMutation.isPending}
                              data-testid={`button-confirm-payment-${payment.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() => {
                                setRejectingPaymentId(payment.id);
                                setRejectionReason('');
                                setRejectPaymentDialogOpen(true);
                              }}
                              disabled={rejectPartnerPaymentMutation.isPending}
                              data-testid={`button-reject-payment-${payment.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reddet
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Partner Payment History - All Partner Payments */}
            {(outgoingPartnerPayments.length > 0 || incomingPartnerPayments.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-purple-500" />
                    Partner Ödeme Geçmişi
                  </CardTitle>
                  <CardDescription>
                    Gönderilen ve alınan partner ödemeleri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...outgoingPartnerPayments, ...incomingPartnerPayments]
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .map(payment => {
                        const isOutgoing = payment.direction === 'outgoing';
                        const statusBadge = () => {
                          if (payment.confirmationStatus === 'confirmed') {
                            return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Onaylandı</Badge>;
                          } else if (payment.confirmationStatus === 'rejected') {
                            return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Reddedildi</Badge>;
                          } else {
                            return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Bekliyor</Badge>;
                          }
                        };
                        return (
                          <div
                            key={`${payment.direction}-${payment.id}`}
                            className={`flex flex-col md:flex-row md:items-center justify-between gap-2 p-2 rounded-lg border ${
                              isOutgoing 
                                ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' 
                                : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                            }`}
                            data-testid={`payment-history-${payment.id}`}
                          >
                            <div className="flex items-center gap-2">
                              {isOutgoing ? (
                                <ArrowUpRight className="h-4 w-4 text-orange-500" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                              )}
                              <span className="font-medium">{payment.partnerName}</span>
                              {statusBadge()}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              {payment.description && (
                                <span className="text-muted-foreground">{payment.description}</span>
                              )}
                              <span className={`font-medium ${isOutgoing ? 'text-orange-600' : 'text-emerald-600'}`}>
                                {isOutgoing ? '-' : '+'}{formatMoney(payment.totalAmountTl)}
                              </span>
                              {payment.createdAt && (
                                <span className="text-muted-foreground text-xs">
                                  {new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold">Partner Acentalar</h3>
                <Badge variant="outline">{filteredPartnerTransactions.length} kayıt</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPartnerTransactionsToExcel(partnerTransactions)}
                  disabled={partnerTransactions.length === 0}
                  data-testid="button-export-partner-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPartnerTransactionsToPDF(partnerTransactions)}
                  disabled={partnerTransactions.length === 0}
                  data-testid="button-export-partner-pdf"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Select value={partnerSortOrder} onValueChange={v => setPartnerSortOrder(v as typeof partnerSortOrder)}>
                  <SelectTrigger className="w-[160px] h-8" data-testid="select-partner-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdNewest">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Ekleme (Yeni)</span>
                    </SelectItem>
                    <SelectItem value="createdOldest">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Ekleme (Eski)</span>
                    </SelectItem>
                    <SelectItem value="dateNewest">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Tarih (Yeni)</span>
                    </SelectItem>
                    <SelectItem value="dateOldest">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Tarih (Eski)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={partnerTransactionRole === 'sender' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPartnerTransactionRole('sender')}
                  data-testid="button-partner-sent"
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Gönderdiklerim
                </Button>
                <Button
                  variant={partnerTransactionRole === 'receiver' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPartnerTransactionRole('receiver')}
                  data-testid="button-partner-received"
                >
                  <ArrowDownLeft className="h-4 w-4 mr-1" />
                  Gelen Müşteriler
                </Button>
                <Button
                  variant={partnerTransactionRole === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPartnerTransactionRole('all')}
                  data-testid="button-partner-all"
                >
                  Tumu
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                {isLoadingPartnerTransactions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : filteredPartnerTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {partnerLogoUrl ? (
                      <img src={partnerLogoUrl} alt="Partner" className="h-12 w-12 mx-auto mb-4 opacity-50 object-contain" />
                    ) : (
                      <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    )}
                    <p>Seçili dönemde partner müşteri işlemi yok</p>
                    <p className="text-sm mt-2">Farklı bir tarih aralığı veya partner seçin</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...filteredPartnerTransactions].sort((a, b) => {
                      switch (partnerSortOrder) {
                        case 'createdNewest': return (b.id || 0) - (a.id || 0);
                        case 'createdOldest': return (a.id || 0) - (b.id || 0);
                        case 'dateNewest': return new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime();
                        case 'dateOldest': return new Date(a.transactionDate || 0).getTime() - new Date(b.transactionDate || 0).getTime();
                        default: return 0;
                      }
                    }).map(tx => {
                      const isSender = tx.currentTenantId === tx.senderTenantId;
                      const partnerName = isSender ? tx.receiverTenantName : tx.senderTenantName;
                      const directionLabel = isSender ? 'Gönderildi' : 'Alındı';
                      const hasTotal = tx.totalAmount && tx.totalAmount > 0;
                      const hasUnit = tx.unitPrice && tx.unitPrice > 0;
                      const currencySymbol = tx.currency === 'USD' ? '$' : tx.currency === 'EUR' ? '\u20AC' : '';
                      const currencySuffix = tx.currency === 'TRY' ? ' TL' : ` ${tx.currency}`;
                      
                      const isPartnerTxExpanded = expandedPartnerTxIds.has(tx.id);
                      
                      return (
                        <Card key={tx.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => togglePartnerTxExpand(tx.id)}
                                  data-testid={`button-expand-partner-tx-${tx.id}`}
                                >
                                  {isPartnerTxExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{tx.customerName}</span>
                                  <Badge variant="secondary" className="gap-1">
                                    {partnerLogoUrl ? (
                                      <img src={partnerLogoUrl} alt="" className="h-3 w-3 object-contain" />
                                    ) : (
                                      <Handshake className="h-3 w-3" />
                                    )}
                                    {partnerName || 'Partner'}
                                  </Badge>
                                  <Badge variant={isSender ? "outline" : "default"} className={isSender ? "" : "bg-blue-600"}>
                                    {isSender ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownLeft className="h-3 w-3 mr-1" />}
                                    {directionLabel}
                                  </Badge>
                                  {tx.status === 'pending' && (
                                    <Badge variant="outline">Beklemede</Badge>
                                  )}
                                  {tx.status === 'confirmed' && (
                                    <Badge variant="default" className="bg-green-600">Onaylandı</Badge>
                                  )}
                                  {tx.status === 'cancelled' && (
                                    <Badge variant="destructive">İptal</Badge>
                                  )}
                                  {tx.deletionStatus === 'pending' && tx.deletionRequestedByTenantId === tx.currentTenantId && (
                                    <Badge variant="outline" className="border-orange-500 text-orange-600">
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Silme Talebi Gönderildi
                                    </Badge>
                                  )}
                                  {tx.deletionStatus === 'pending' && tx.deletionRequestedByTenantId !== tx.currentTenantId && (
                                    <Badge variant="outline" className="border-red-500 text-red-600 animate-pulse">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Silme Onayı Bekleniyor
                                    </Badge>
                                  )}
                                  {tx.deletionStatus === 'rejected' && (
                                    <Badge variant="outline" className="border-gray-500 text-gray-600">
                                      <X className="h-3 w-3 mr-1" />
                                      Silme Reddedildi
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDateTR(tx.transactionDate)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {tx.guestCount} kişi
                                  </span>
                                  {tx.activityName && (
                                    <span>{tx.activityName}</span>
                                  )}
                                </div>
                                {tx.paymentCollectionType && tx.paymentCollectionType !== 'receiver_full' && (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {tx.paymentCollectionType === 'sender_full' 
                                        ? 'Gönderen Tam Tahsil Etti' 
                                        : tx.paymentCollectionType === 'sender_partial'
                                        ? `Gönderen ${(tx.amountCollectedBySender || 0).toLocaleString('tr-TR')} ${tx.currency} Tahsil Etti`
                                        : ''}
                                    </Badge>
                                    {tx.amountDueToReceiver !== undefined && tx.amountDueToReceiver > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        Alici Alacak: {tx.amountDueToReceiver.toLocaleString('tr-TR')} {tx.currency}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right space-y-1">
                                {hasTotal ? (
                                  <Badge variant="default" className="bg-green-600">
                                    {currencySymbol}
                                    {tx.totalAmount!.toLocaleString('tr-TR')}
                                    {currencySuffix}
                                  </Badge>
                                ) : hasUnit ? (
                                  <Badge variant="secondary">
                                    {currencySymbol}
                                    {tx.unitPrice!.toLocaleString('tr-TR')}
                                    {currencySuffix}
                                    <span className="opacity-75"> / kişi</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Fiyat belirlenmedi</Badge>
                                )}
                                {tx.balanceOwed !== undefined && tx.balanceOwed > 0 && (
                                  <div className="text-xs">
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        // balanceOwed = amount sender must pay to receiver (always >= 0)
                                        // When isSender: this is my liability (red/-)
                                        // When isReceiver: this is my receivable (green/+)
                                        isSender 
                                          ? 'border-red-500 text-red-600' 
                                          : 'border-green-500 text-green-600'
                                      }
                                    >
                                      {isSender 
                                        ? `-${tx.balanceOwed.toLocaleString('tr-TR')}` 
                                        : `+${tx.balanceOwed.toLocaleString('tr-TR')}`
                                      } {tx.currency}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                          {isPartnerTxExpanded && (
                            <div className="border-t bg-muted/30 p-3">
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  Fiyat Kalemleri
                                </div>
                                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-sm">
                                  <div className="font-medium text-muted-foreground text-xs">Açıklama</div>
                                  <div className="font-medium text-muted-foreground text-xs text-right">Adet</div>
                                  <div className="font-medium text-muted-foreground text-xs text-right">Birim</div>
                                  <div className="font-medium text-muted-foreground text-xs text-right">Toplam</div>
                                  <div className="contents">
                                    <span>{tx.activityName || 'Aktivite'}</span>
                                    <span className="text-right">{tx.guestCount}</span>
                                    <span className="text-right">
                                      {currencySymbol}{(tx.unitPrice || 0).toLocaleString('tr-TR')}{currencySuffix}
                                    </span>
                                    <span className="text-right font-medium">
                                      {currencySymbol}{(tx.totalAmount || 0).toLocaleString('tr-TR')}{currencySuffix}
                                    </span>
                                  </div>
                                </div>
                                {tx.paymentCollectionType && (
                                  <div className="pt-2 border-t mt-2 space-y-1">
                                    <div className="text-xs text-muted-foreground">
                                      <span className="font-medium">Ödeme Tipi:</span>{' '}
                                      {tx.paymentCollectionType === 'receiver_full' 
                                        ? 'Alıcı tam tahsil edecek' 
                                        : tx.paymentCollectionType === 'sender_full'
                                        ? 'Gönderen tam tahsil etti'
                                        : tx.paymentCollectionType === 'sender_partial'
                                        ? 'Gönderen kısmi tahsil etti'
                                        : tx.paymentCollectionType}
                                    </div>
                                    {tx.amountCollectedBySender !== undefined && tx.amountCollectedBySender > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">Gönderenin Tahsil Ettiği:</span>{' '}
                                        {currencySymbol}{tx.amountCollectedBySender.toLocaleString('tr-TR')}{currencySuffix}
                                      </div>
                                    )}
                                    {tx.balanceOwed !== undefined && tx.balanceOwed > 0 && (
                                      <div className={`text-xs ${isSender ? 'text-red-600' : 'text-green-600'}`}>
                                        <span className="font-medium">{isSender ? 'Borcunuz:' : 'Alacağınız:'}</span>{' '}
                                        {currencySymbol}{tx.balanceOwed.toLocaleString('tr-TR')}{currencySuffix}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Silme İşlemleri */}
                                <div className="pt-3 border-t mt-3">
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                    İşlemler
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {/* Silme Talebi Yok - Talep Et butonu */}
                                    {!tx.deletionStatus && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                        onClick={() => requestDeletionMutation.mutate(tx.id)}
                                        disabled={requestDeletionMutation.isPending}
                                        data-testid={`button-request-deletion-${tx.id}`}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Silme Talebi Gönder
                                      </Button>
                                    )}
                                    
                                    {/* Pending ve ben talep ettim - İptal Et */}
                                    {tx.deletionStatus === 'pending' && tx.deletionRequestedByTenantId === tx.currentTenantId && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => cancelDeletionMutation.mutate(tx.id)}
                                        disabled={cancelDeletionMutation.isPending}
                                        data-testid={`button-cancel-deletion-${tx.id}`}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Talebi İptal Et
                                      </Button>
                                    )}
                                    
                                    {/* Pending ve karşı taraf talep etti - Onayla/Reddet */}
                                    {tx.deletionStatus === 'pending' && tx.deletionRequestedByTenantId !== tx.currentTenantId && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700"
                                          onClick={() => approveDeletionMutation.mutate(tx.id)}
                                          disabled={approveDeletionMutation.isPending}
                                          data-testid={`button-approve-deletion-${tx.id}`}
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          Silmeyi Onayla
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 border-red-300"
                                          onClick={() => rejectDeletionMutation.mutate({ id: tx.id })}
                                          disabled={rejectDeletionMutation.isPending}
                                          data-testid={`button-reject-deletion-${tx.id}`}
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          Reddet
                                        </Button>
                                      </>
                                    )}
                                    
                                    {/* Reddedildi - Tekrar Talep Et */}
                                    {tx.deletionStatus === 'rejected' && (
                                      <>
                                        <div className="w-full text-xs text-muted-foreground mb-1">
                                          Ret sebebi: {tx.deletionRejectionReason || 'Belirtilmedi'}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                          onClick={() => requestDeletionMutation.mutate(tx.id)}
                                          disabled={requestDeletionMutation.isPending}
                                          data-testid={`button-retry-deletion-${tx.id}`}
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Tekrar Silme Talebi Gönder
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {financeTab === 'agencies' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Acentalar</h3>
                <Badge variant="outline">{dispatchSummary.length} acenta</Badge>
              </div>
              {canManageAgencies && (
                <Button onClick={() => setAgencyDialogOpen(true)} data-testid="button-add-agency">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Acenta Ekle
                </Button>
              )}
            </div>

            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Acenta</CardTitle>
                  <Umbrella className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-supplier-count">{suppliers.length}</div>
                  <p className="text-xs text-muted-foreground">Aktif acenta firma</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Gönderilen Misafir</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-guest-count">{totalGuests}</div>
                  <p className="text-xs text-muted-foreground">Seçili dönemde</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Ödeme</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-total-paid">{formatMoney(totalPaid)}</div>
                  <p className="text-xs text-muted-foreground">Acentalara ödenen</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Kalan Borç</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600" data-testid="text-remaining-debt">{formatMoney(totalOwed - totalPaid)}</div>
                  <p className="text-xs text-muted-foreground">Ödenmesi gereken</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Acenta Listesi</CardTitle>
                <CardDescription>
                  Tedarikçi acentalarınızın finansal durumu ve detayları
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dispatchSummary.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz acenta kaydı bulunamadı</p>
                    <p className="text-sm mt-2">Gönderim ekleyerek acentaları sisteme tanıtabilirsiniz.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dispatchSummary.map(summary => {
                      const supplier = suppliers.find(s => s.id === summary.agencyId);
                      const isDebt = summary.remainingTl > 0;
                      const isCredit = summary.remainingTl < 0;
                      const isPartner = supplier?.isSmartUser && supplier?.partnerTenantId;
                      return (
                        <Card 
                          key={summary.agencyId} 
                          className={`hover-elevate cursor-pointer ${isPartner ? 'border-purple-300 dark:border-purple-700' : ''}`}
                          onClick={() => setSelectedAgencyId(selectedAgencyId === summary.agencyId ? null : summary.agencyId)}
                          data-testid={`card-agency-summary-${summary.agencyId}`}
                        >
                          <CardContent className="py-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {summary.agencyName}
                                    {isPartner && (
                                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-xs">
                                        Partner
                                      </Badge>
                                    )}
                                    {selectedAgencyId === summary.agencyId && (
                                      <Badge variant="default" className="text-xs">Seçili</Badge>
                                    )}
                                  </div>
                                  {supplier?.contactInfo && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {supplier.contactInfo}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Kişi:</span>
                                  <span className="font-medium">{summary.totalGuests}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Borç:</span>
                                  <span className="font-medium">
                                    {summary.totalOwedTl > 0 && `${summary.totalOwedTl.toLocaleString('tr-TR')} TL`}
                                    {summary.totalOwedTl > 0 && summary.totalOwedUsd > 0 && ' + '}
                                    {summary.totalOwedUsd > 0 && `$${summary.totalOwedUsd.toLocaleString('en-US')}`}
                                    {summary.totalOwedTl === 0 && summary.totalOwedUsd === 0 && '0 TL'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Ödenen:</span>
                                  <span className="font-medium text-green-600">{summary.totalPaidTl.toLocaleString('tr-TR')} TL</span>
                                </div>
                                <Badge variant={isDebt ? "destructive" : isCredit ? "secondary" : "outline"}>
                                  Kalan: {isCredit ? '+' : ''}{summary.remainingTl.toLocaleString('tr-TR')} TL
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedAgencyId && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{suppliers.find(s => s.id === selectedAgencyId)?.name}</span> seçili. 
                  Diğer sekmelerde bu acentaya ait kayıtlar filtrelenecek.
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedAgencyId(null)}
                    className="ml-2"
                    data-testid="button-clear-agency-selection"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Filtreyi Kaldır
                  </Button>
                </p>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Ödeme Dialog */}
        <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ödeme Kaydı Ekle</DialogTitle>
              <DialogDescription>Tedarikçi firmaya yapılan ödemeyi kaydedin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tedarikçi</Label>
                <Select 
                  value={payoutForm.agencyId ? String(payoutForm.agencyId) : ""} 
                  onValueChange={v => {
                    const supplierId = parseInt(v);
                    const supplier = suppliers.find(s => s.id === supplierId);
                    setPayoutForm(f => ({ 
                      ...f, 
                      agencyId: supplierId,
                      baseAmountTl: supplier ? (f.guestCount * (supplier.defaultPayoutPerGuest || 0)) : f.baseAmountTl
                    }));
                  }}
                >
                  <SelectTrigger data-testid="select-payout-supplier">
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dönem Başlangıcı</Label>
                  <Input 
                    type="date"
                    value={payoutForm.periodStart}
                    onChange={e => setPayoutForm(f => ({ ...f, periodStart: e.target.value }))}
                    data-testid="input-payout-start"
                  />
                </div>
                <div>
                  <Label>Dönem Bitişi</Label>
                  <Input 
                    type="date"
                    value={payoutForm.periodEnd}
                    onChange={e => setPayoutForm(f => ({ ...f, periodEnd: e.target.value }))}
                    data-testid="input-payout-end"
                  />
                </div>
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input 
                  value={payoutForm.description}
                  onChange={e => setPayoutForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Örnek: Aralık ayı paragliding"
                  data-testid="input-payout-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Misafir Sayısı</Label>
                  <Input 
                    type="number"
                    value={payoutForm.guestCount}
                    onChange={e => {
                      const count = parseInt(e.target.value) || 0;
                      const supplier = suppliers.find(s => s.id === payoutForm.agencyId);
                      setPayoutForm(f => ({ 
                        ...f, 
                        guestCount: count,
                        baseAmountTl: supplier ? (count * (supplier.defaultPayoutPerGuest || 0)) : f.baseAmountTl
                      }));
                    }}
                    data-testid="input-payout-guests"
                  />
                </div>
                <div>
                  <Label>Tutar (TL)</Label>
                  <Input 
                    type="number"
                    value={payoutForm.baseAmountTl}
                    onChange={e => setPayoutForm(f => ({ ...f, baseAmountTl: parseInt(e.target.value) || 0 }))}
                    data-testid="input-payout-amount"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ödeme Yöntemi</Label>
                  <Select value={payoutForm.method} onValueChange={v => setPayoutForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger data-testid="select-payout-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Nakit</SelectItem>
                      <SelectItem value="bank">Banka Transferi</SelectItem>
                      <SelectItem value="card">Kart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Durum</Label>
                  <Select value={payoutForm.status} onValueChange={v => setPayoutForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger data-testid="select-payout-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Ödendi</SelectItem>
                      <SelectItem value="pending">Beklemede</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Referans / Dekont No</Label>
                <Input 
                  value={payoutForm.reference}
                  onChange={e => setPayoutForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="Ödeme referans numarası"
                  data-testid="input-payout-reference"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={payoutForm.notes}
                  onChange={e => setPayoutForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-payout-notes"
                />
              </div>
              {payoutForm.baseAmountTl > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Toplam Ödeme:</span>
                    <span className="font-bold text-orange-600">{formatMoney(payoutForm.baseAmountTl)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayoutDialogOpen(false)} data-testid="button-cancel-payout">İptal</Button>
              <Button 
                onClick={handlePayoutSubmit}
                disabled={createPayoutMutation.isPending}
                data-testid="button-save-payout"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Gönderim Dialog */}
        <Dialog open={dispatchDialogOpen} onOpenChange={(open) => {
          setDispatchDialogOpen(open);
          if (!open) resetDispatchForm();
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gönderim Kaydı Ekle</DialogTitle>
              <DialogDescription>Tedarikçi firmaya gönderilen misafirleri kaydedin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tedarikçi</Label>
                  <Select 
                    value={dispatchForm.agencyId ? String(dispatchForm.agencyId) : ""} 
                    onValueChange={v => {
                      const supplierId = parseInt(v);
                      const supplier = suppliers.find(s => s.id === supplierId);
                      setDispatchForm(f => ({ ...f, agencyId: supplierId }));
                      // Basit mod için fiyat güncelle
                      const matchingRate = rates.find(r => 
                        r.agencyId === supplierId && 
                        (!r.activityId || r.activityId === dispatchForm.activityId) &&
                        (!r.validFrom || r.validFrom <= dispatchForm.dispatchDate) &&
                        (!r.validTo || r.validTo >= dispatchForm.dispatchDate)
                      );
                      if (matchingRate) {
                        const price = matchingRate.currency === 'USD' ? (matchingRate.unitPayoutUsd || 0) : matchingRate.unitPayoutTl;
                        setSimpleUnitPayout(price);
                        setSimpleCurrency(matchingRate.currency as 'TRY' | 'USD');
                      } else if (supplier) {
                        setSimpleUnitPayout(supplier.defaultPayoutPerGuest || 0);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-dispatch-supplier">
                      <SelectValue placeholder="Tedarikçi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers
                        .filter(s => !(s.isSmartUser && s.partnerTenantId))
                        .map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Aktivite (Opsiyonel)</Label>
                  <Select 
                    value={dispatchForm.activityId ? String(dispatchForm.activityId) : ""} 
                    onValueChange={v => {
                      const activityId = parseInt(v) || 0;
                      setDispatchForm(f => ({ ...f, activityId }));
                      // Basit mod için fiyat güncelle
                      if (dispatchForm.agencyId && activityId) {
                        const matchingRate = rates.find(r => 
                          r.agencyId === dispatchForm.agencyId && 
                          r.activityId === activityId &&
                          (!r.validFrom || r.validFrom <= dispatchForm.dispatchDate) &&
                          (!r.validTo || r.validTo >= dispatchForm.dispatchDate)
                        );
                        if (matchingRate) {
                          const price = matchingRate.currency === 'USD' ? (matchingRate.unitPayoutUsd || 0) : matchingRate.unitPayoutTl;
                          setSimpleUnitPayout(price);
                          setSimpleCurrency(matchingRate.currency as 'TRY' | 'USD');
                        }
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-dispatch-activity">
                      <SelectValue placeholder="Aktivite seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Müşteri Adı Soyadı</Label>
                <Input 
                  value={dispatchForm.customerName}
                  onChange={e => setDispatchForm(f => ({ ...f, customerName: e.target.value }))}
                  placeholder="Örn: Ahmet Yılmaz"
                  data-testid="input-dispatch-customer-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tarih</Label>
                  <Input 
                    type="date"
                    value={dispatchForm.dispatchDate}
                    onChange={e => setDispatchForm(f => ({ ...f, dispatchDate: e.target.value }))}
                    data-testid="input-dispatch-date"
                  />
                </div>
                <div>
                  <Label>Saat</Label>
                  <Input 
                    type="time"
                    value={dispatchForm.dispatchTime}
                    onChange={e => setDispatchForm(f => ({ ...f, dispatchTime: e.target.value }))}
                    data-testid="input-dispatch-time"
                  />
                </div>
              </div>

              {/* Basit / Detaylı Mod Seçimi */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Fiyatlama Modu:</span>
                <Button
                  type="button"
                  size="sm"
                  variant={!useLineItems ? "default" : "outline"}
                  onClick={() => setUseLineItems(false)}
                  data-testid="button-simple-mode"
                >
                  Basit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={useLineItems ? "default" : "outline"}
                  onClick={() => setUseLineItems(true)}
                  data-testid="button-detailed-mode"
                >
                  Detaylı (Satır Bazlı)
                </Button>
              </div>

              {!useLineItems ? (
                /* Basit Mod */
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Misafir Sayısı</Label>
                    <Input 
                      type="number"
                      min="1"
                      value={simpleGuestCount}
                      onChange={e => setSimpleGuestCount(parseInt(e.target.value) || 1)}
                      data-testid="input-dispatch-guests"
                    />
                  </div>
                  <div>
                    <Label>Kişi Başı</Label>
                    <Input 
                      type="number"
                      value={simpleUnitPayout}
                      onChange={e => setSimpleUnitPayout(parseInt(e.target.value) || 0)}
                      data-testid="input-dispatch-unit"
                    />
                  </div>
                  <div>
                    <Label>Para Birimi</Label>
                    <Select 
                      value={simpleCurrency} 
                      onValueChange={v => setSimpleCurrency(v as 'TRY' | 'USD')}
                    >
                      <SelectTrigger data-testid="select-dispatch-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TL</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                /* Detaylı Mod - Satır Bazlı Kalemler */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Kalemler</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDispatchForm(f => ({
                        ...f,
                        items: [...f.items, { ...defaultDispatchItem }]
                      }))}
                      data-testid="button-add-item"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Kalem Ekle
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {dispatchForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg">
                        <div className="col-span-4">
                          <Label className="text-xs">Açıklama</Label>
                          <Input
                            placeholder="Örn: Yetişkin dalıcı"
                            value={item.label}
                            onChange={e => {
                              const newItems = [...dispatchForm.items];
                              newItems[index].label = e.target.value;
                              setDispatchForm(f => ({ ...f, items: newItems }));
                            }}
                            data-testid={`input-item-label-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Adet</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const newItems = [...dispatchForm.items];
                              newItems[index].quantity = parseInt(e.target.value) || 1;
                              setDispatchForm(f => ({ ...f, items: newItems }));
                            }}
                            data-testid={`input-item-quantity-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Birim Fiyat</Label>
                          <Input
                            type="number"
                            value={item.unitAmount}
                            onChange={e => {
                              const newItems = [...dispatchForm.items];
                              newItems[index].unitAmount = parseInt(e.target.value) || 0;
                              setDispatchForm(f => ({ ...f, items: newItems }));
                            }}
                            data-testid={`input-item-amount-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Para</Label>
                          <Select
                            value={item.currency}
                            onValueChange={v => {
                              const newItems = [...dispatchForm.items];
                              newItems[index].currency = v as 'TRY' | 'USD';
                              setDispatchForm(f => ({ ...f, items: newItems }));
                            }}
                          >
                            <SelectTrigger data-testid={`select-item-currency-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TRY">TL</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (dispatchForm.items.length > 1) {
                                setDispatchForm(f => ({
                                  ...f,
                                  items: f.items.filter((_, i) => i !== index)
                                }));
                              }
                            }}
                            disabled={dispatchForm.items.length <= 1}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={dispatchForm.notes}
                  onChange={e => setDispatchForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-dispatch-notes"
                />
              </div>

              {/* Toplam Özeti */}
              {(() => {
                let totalTl = 0;
                let totalUsd = 0;
                let guestCount = 0;
                
                if (useLineItems) {
                  dispatchForm.items.forEach(item => {
                    const itemTotal = item.quantity * item.unitAmount;
                    if (item.currency === 'USD') {
                      totalUsd += itemTotal;
                    } else {
                      totalTl += itemTotal;
                    }
                    if (item.itemType === 'base' || item.itemType === 'observer') {
                      guestCount += item.quantity;
                    }
                  });
                } else {
                  guestCount = simpleGuestCount;
                  const total = simpleGuestCount * simpleUnitPayout;
                  if (simpleCurrency === 'USD') {
                    totalUsd = total;
                  } else {
                    totalTl = total;
                  }
                }
                
                return (totalTl > 0 || totalUsd > 0) ? (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Misafir Sayısı:</span>
                      <span className="font-medium">{guestCount}</span>
                    </div>
                    {totalTl > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Toplam (TL):</span>
                        <span className="font-bold text-orange-600">{formatMoney(totalTl)}</span>
                      </div>
                    )}
                    {totalUsd > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Toplam (USD):</span>
                        <span className="font-bold text-green-600">${totalUsd.toLocaleString('en-US')}</span>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDispatchDialogOpen(false); resetDispatchForm(); }} data-testid="button-cancel-dispatch">İptal</Button>
              <Button 
                onClick={handleDispatchSubmit}
                disabled={createDispatchMutation.isPending}
                data-testid="button-save-dispatch"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fiyat Dialog */}
        <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Fiyat Düzenle' : 'Yeni Fiyat'}</DialogTitle>
              <DialogDescription>Acenta firma için dönemsel ödeme fiyatı tanımlayın</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Acenta</Label>
                <Select 
                  value={rateForm.agencyId ? String(rateForm.agencyId) : ""} 
                  onValueChange={v => setRateForm(f => ({ ...f, agencyId: parseInt(v) }))}
                >
                  <SelectTrigger data-testid="select-rate-supplier">
                    <SelectValue placeholder="Acenta seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aktivite (Opsiyonel - boş birakilirsa genel fiyat)</Label>
                <Select 
                  value={rateForm.activityId ? String(rateForm.activityId) : "0"} 
                  onValueChange={v => setRateForm(f => ({ ...f, activityId: parseInt(v) || 0 }))}
                >
                  <SelectTrigger data-testid="select-rate-activity">
                    <SelectValue placeholder="Genel fiyat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Genel (Tum aktiviteler)</SelectItem>
                    {activities.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Geçerlilik Başlangıçi</Label>
                  <Input 
                    type="date"
                    value={rateForm.validFrom}
                    onChange={e => setRateForm(f => ({ ...f, validFrom: e.target.value }))}
                    data-testid="input-rate-from"
                  />
                </div>
                <div>
                  <Label>Geçerlilik Bitişi (Opsiyonel)</Label>
                  <Input 
                    type="date"
                    value={rateForm.validTo}
                    onChange={e => setRateForm(f => ({ ...f, validTo: e.target.value }))}
                    data-testid="input-rate-to"
                  />
                </div>
              </div>
              <div>
                <Label>Para Birimi</Label>
                <Select 
                  value={rateForm.currency} 
                  onValueChange={v => setRateForm(f => ({ ...f, currency: v }))}
                >
                  <SelectTrigger data-testid="select-rate-currency">
                    <SelectValue placeholder="Para birimi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TL (Türk Lirası)</SelectItem>
                    <SelectItem value="USD">USD (Amerikan Doları)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kişi Başı Ödeme ({rateForm.currency === 'TRY' ? 'TL' : 'USD'})</Label>
                <Input 
                  type="number"
                  min="0"
                  value={rateForm.currency === 'TRY' ? rateForm.unitPayoutTl : rateForm.unitPayoutUsd}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    if (rateForm.currency === 'TRY') {
                      setRateForm(f => ({ ...f, unitPayoutTl: val }));
                    } else {
                      setRateForm(f => ({ ...f, unitPayoutUsd: val }));
                    }
                  }}
                  data-testid="input-rate-amount"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={rateForm.notes}
                  onChange={e => setRateForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-rate-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRateDialogOpen(false)} data-testid="button-cancel-rate">İptal</Button>
              <Button 
                onClick={handleRateSubmit}
                disabled={createRateMutation.isPending || updateRateMutation.isPending}
                data-testid="button-save-rate"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Acenta Ekleme Dialog */}
        <Dialog open={agencyDialogOpen} onOpenChange={setAgencyDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Acenta Ekle</DialogTitle>
              <DialogDescription>Tedarikçi acenta bilgilerini girin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Acenta Adı *</Label>
                <Input 
                  value={agencyForm.name}
                  onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Acenta adı"
                  data-testid="input-agency-name"
                />
              </div>
              <div>
                <Label>İletişim Bilgisi</Label>
                <Input 
                  value={agencyForm.contactInfo}
                  onChange={e => setAgencyForm(f => ({ ...f, contactInfo: e.target.value }))}
                  placeholder="Telefon veya e-posta"
                  data-testid="input-agency-contact"
                />
              </div>
              <div>
                <Label>Kişi Başı Varsayılan Ödeme (TL)</Label>
                <Input 
                  type="number"
                  min="0"
                  value={agencyForm.defaultPayoutPerGuest}
                  onChange={e => setAgencyForm(f => ({ ...f, defaultPayoutPerGuest: parseInt(e.target.value) || 0 }))}
                  data-testid="input-agency-payout"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={agencyForm.notes}
                  onChange={e => setAgencyForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-agency-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAgencyDialogOpen(false)} data-testid="button-cancel-agency">İptal</Button>
              <Button 
                onClick={() => {
                  if (!agencyForm.name.trim()) {
                    toast({ title: "Hata", description: "Acenta adı zorunludur", variant: "destructive" });
                    return;
                  }
                  const sanitizedForm = {
                    ...agencyForm,
                    defaultPayoutPerGuest: Math.max(0, agencyForm.defaultPayoutPerGuest || 0)
                  };
                  createAgencyMutation.mutate(sanitizedForm);
                }}
                disabled={createAgencyMutation.isPending}
                data-testid="button-save-agency"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Partner Payment Rejection Dialog */}
        <Dialog open={rejectPaymentDialogOpen} onOpenChange={setRejectPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Partner Ödemesini Reddet</DialogTitle>
              <DialogDescription>
                Bu ödemeyi reddetmek istediğinizden emin misiniz? Lütfen red sebebini belirtin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Red Sebebi</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Ödeme belgesi alınmadı, miktar yanlış, vb."
                  data-testid="input-rejection-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectPaymentDialogOpen(false)}>İptal</Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (rejectingPaymentId) {
                    rejectPartnerPaymentMutation.mutate({ id: rejectingPaymentId, reason: rejectionReason });
                    setRejectPaymentDialogOpen(false);
                    setRejectingPaymentId(null);
                    setRejectionReason('');
                  }
                }}
                disabled={rejectPartnerPaymentMutation.isPending}
                data-testid="button-confirm-reject"
              >
                Reddet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
