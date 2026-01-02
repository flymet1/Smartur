import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, CalendarHeart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Holiday } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOLIDAY_TYPES = [
  { value: 'official', label: 'Resmi Tatil' },
  { value: 'religious', label: 'Dini Bayram' },
  { value: 'special', label: 'Ozel Gun' },
];

const PRESET_HOLIDAYS_2026 = [
  { name: "Yilbasi", startDate: "2026-01-01", endDate: "2026-01-01", type: "official", keywords: '["yilbasi", "yeni yil", "1 ocak"]' },
  { name: "23 Nisan Ulusal Egemenlik ve Cocuk Bayrami", startDate: "2026-04-23", endDate: "2026-04-23", type: "official", keywords: '["23 nisan", "cocuk bayrami", "ulusal egemenlik"]' },
  { name: "1 Mayis Emek ve Dayanisma Gunu", startDate: "2026-05-01", endDate: "2026-05-01", type: "official", keywords: '["1 mayis", "isci bayrami", "emek gunu"]' },
  { name: "19 Mayis Ataturku Anma Genclik ve Spor Bayrami", startDate: "2026-05-19", endDate: "2026-05-19", type: "official", keywords: '["19 mayis", "genclik bayrami"]' },
  { name: "15 Temmuz Demokrasi ve Milli Birlik Gunu", startDate: "2026-07-15", endDate: "2026-07-15", type: "official", keywords: '["15 temmuz"]' },
  { name: "30 Agustos Zafer Bayrami", startDate: "2026-08-30", endDate: "2026-08-30", type: "official", keywords: '["30 agustos", "zafer bayrami"]' },
  { name: "29 Ekim Cumhuriyet Bayrami", startDate: "2026-10-29", endDate: "2026-10-29", type: "official", keywords: '["29 ekim", "cumhuriyet bayrami"]' },
  { name: "Ramazan Bayrami 2026", startDate: "2026-03-20", endDate: "2026-03-22", type: "religious", keywords: '["ramazan bayrami", "seker bayrami", "bayram"]' },
  { name: "Kurban Bayrami 2026", startDate: "2026-05-27", endDate: "2026-05-30", type: "religious", keywords: '["kurban bayrami", "bayram"]' },
];

export default function Holidays() {
  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays']
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
    }
  });

  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (confirm("Bu tatili silmek istediginize emin misiniz?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Basarili", description: "Tatil silindi." });
      } catch (error) {
        toast({ title: "Hata", description: "Silme islemi basarisiz.", variant: "destructive" });
      }
    }
  };

  const handleImportPresets = async () => {
    if (!confirm("2026 yili icin varsayilan tatilleri eklemek istiyor musunuz?")) return;
    
    let added = 0;
    for (const preset of PRESET_HOLIDAYS_2026) {
      try {
        await createMutation.mutateAsync({
          ...preset,
          isActive: true,
          notes: ''
        });
        added++;
      } catch (e) {
        console.error('Failed to add holiday:', preset.name, e);
      }
    }
    toast({ title: "Basarili", description: `${added} tatil eklendi.` });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">Tatiller</h1>
            <p className="text-muted-foreground mt-1">Resmi tatiller ve bayramlari yonetin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {holidays.length === 0 && (
              <Button variant="outline" onClick={handleImportPresets} data-testid="button-import-presets">
                2026 Tatillerini Ekle
              </Button>
            )}
            <HolidayDialog />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {holidays.map((holiday) => (
              <HolidayCard 
                key={holiday.id} 
                holiday={holiday} 
                onDelete={() => handleDelete(holiday.id)} 
              />
            ))}
            {holidays.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
                Henuz hic tatil eklenmemis. "2026 Tatillerini Ekle" butonuna tiklayarak baslayabilirsiniz.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function HolidayCard({ holiday, onDelete }: { holiday: Holiday; onDelete: () => void }) {
  const typeLabel = HOLIDAY_TYPES.find(t => t.value === holiday.type)?.label || holiday.type;
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };
  
  const isMultiDay = holiday.startDate !== holiday.endDate;
  
  let keywords: string[] = [];
  try {
    keywords = JSON.parse(holiday.keywords || '[]');
  } catch {}

  return (
    <div className="dashboard-card group relative overflow-visible flex flex-col h-full" data-testid={`card-holiday-${holiday.id}`}>
      <div className={`h-32 p-6 flex items-center justify-center ${
        holiday.type === 'religious' 
          ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5' 
          : holiday.type === 'special'
          ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5'
          : 'bg-gradient-to-br from-blue-500/20 to-blue-500/5'
      }`}>
        <CalendarHeart className={`w-12 h-12 group-hover:scale-110 transition-transform duration-300 ${
          holiday.type === 'religious' 
            ? 'text-amber-500/40' 
            : holiday.type === 'special'
            ? 'text-pink-500/40'
            : 'text-blue-500/40'
        }`} />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-lg leading-tight" data-testid={`text-holiday-name-${holiday.id}`}>{holiday.name}</h3>
          <Badge variant={holiday.isActive ? "default" : "secondary"} className="shrink-0">
            {holiday.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground mb-2">
          {isMultiDay 
            ? `${formatDate(holiday.startDate)} - ${formatDate(holiday.endDate)}`
            : formatDate(holiday.startDate)
          }
        </div>
        
        <Badge variant="outline" className="w-fit mb-3">{typeLabel}</Badge>
        
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {keywords.slice(0, 3).map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
            ))}
            {keywords.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{keywords.length - 3}</Badge>
            )}
          </div>
        )}
        
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <HolidayDialog holiday={holiday} />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onDelete}
            data-testid={`button-delete-holiday-${holiday.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function HolidayDialog({ holiday }: { holiday?: Holiday }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(holiday?.name || "");
  const [startDate, setStartDate] = useState(holiday?.startDate || "");
  const [endDate, setEndDate] = useState(holiday?.endDate || "");
  const [type, setType] = useState(holiday?.type || "official");
  const [keywords, setKeywords] = useState(holiday?.keywords || "[]");
  const [notes, setNotes] = useState(holiday?.notes || "");
  const [isActive, setIsActive] = useState(holiday?.isActive !== false);
  
  const { toast } = useToast();
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      setOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('PATCH', `/api/holidays/${holiday?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      setOpen(false);
    }
  });

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setType("official");
    setKeywords("[]");
    setNotes("");
    setIsActive(true);
  };

  const handleSubmit = async () => {
    if (!name || !startDate || !endDate) {
      toast({ title: "Hata", description: "Tatil adi, baslangic ve bitis tarihi zorunlu.", variant: "destructive" });
      return;
    }
    
    const data = {
      name,
      startDate,
      endDate,
      type,
      keywords,
      notes,
      isActive
    };
    
    try {
      if (holiday) {
        await updateMutation.mutateAsync(data);
        toast({ title: "Basarili", description: "Tatil guncellendi." });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: "Basarili", description: "Tatil eklendi." });
      }
    } catch (error) {
      toast({ title: "Hata", description: "Islem basarisiz.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        variant={holiday ? "ghost" : "default"}
        size={holiday ? "icon" : "default"}
        onClick={() => {
          if (holiday) {
            setName(holiday.name);
            setStartDate(holiday.startDate);
            setEndDate(holiday.endDate);
            setType(holiday.type || "official");
            setKeywords(holiday.keywords || "[]");
            setNotes(holiday.notes || "");
            setIsActive(holiday.isActive !== false);
          }
          setOpen(true);
        }}
        data-testid={holiday ? `button-edit-holiday-${holiday.id}` : "button-add-holiday"}
      >
        {holiday ? <Edit className="h-4 w-4" /> : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Tatil Ekle
          </>
        )}
      </Button>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{holiday ? "Tatil Duzenle" : "Yeni Tatil Ekle"}</DialogTitle>
          <DialogDescription>
            Resmi tatil veya dini bayram bilgilerini girin.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Tatil Adi</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="orn: 29 Ekim Cumhuriyet Bayrami"
              data-testid="input-holiday-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Baslangic Tarihi</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-holiday-start-date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Bitis Tarihi</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-holiday-end-date"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Tatil Turu</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-holiday-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="keywords">Anahtar Kelimeler (JSON)</Label>
            <Textarea
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder='["bayram", "tatil", "kurban"]'
              className="font-mono text-sm"
              data-testid="input-holiday-keywords"
            />
            <p className="text-xs text-muted-foreground">Bot bu kelimeleri algiladiginda bu tatili bulur.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek notlar..."
              data-testid="input-holiday-notes"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Aktif</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-holiday-active"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Iptal</Button>
          <Button onClick={handleSubmit} data-testid="button-save-holiday">
            {holiday ? "Guncelle" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
