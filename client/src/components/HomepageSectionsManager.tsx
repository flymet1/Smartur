import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Edit,
  Save,
  X,
  Layers
} from "lucide-react";

interface HomepageSection {
  id: number;
  tenantId: number;
  title: string;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  sectionType: string;
  displayOrder: number;
  isActive: boolean;
  activityIds: string;
  maxItems: number;
}

interface Activity {
  id: number;
  name: string;
  imageUrl?: string;
}

export function HomepageSectionsManager() {
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    titleEn: "",
    subtitle: "",
    subtitleEn: "",
    sectionType: "activities",
    displayOrder: 0,
    isActive: true,
    activityIds: [] as number[],
    maxItems: 6,
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery<HomepageSection[]>({
    queryKey: ["/api/homepage-sections"],
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/homepage-sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-sections"] });
      toast({ title: "Bölüm oluşturuldu" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Hata oluştu", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest("PUT", `/api/homepage-sections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-sections"] });
      toast({ title: "Bölüm güncellendi" });
      resetForm();
      setEditingSection(null);
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Hata oluştu", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/homepage-sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-sections"] });
      toast({ title: "Bölüm silindi" });
    },
    onError: () => {
      toast({ title: "Hata oluştu", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      titleEn: "",
      subtitle: "",
      subtitleEn: "",
      sectionType: "activities",
      displayOrder: sections?.length || 0,
      isActive: true,
      activityIds: [],
      maxItems: 6,
    });
    setEditingSection(null);
  };

  const safeParseIds = (jsonStr: string | null): number[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'number') : [];
    } catch {
      return [];
    }
  };

  const handleEdit = (section: HomepageSection) => {
    setEditingSection(section);
    setFormData({
      title: section.title,
      titleEn: section.titleEn || "",
      subtitle: section.subtitle || "",
      subtitleEn: section.subtitleEn || "",
      sectionType: section.sectionType || "activities",
      displayOrder: section.displayOrder,
      isActive: section.isActive,
      activityIds: safeParseIds(section.activityIds),
      maxItems: section.maxItems || 6,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleActivity = (activityId: number) => {
    setFormData(prev => ({
      ...prev,
      activityIds: prev.activityIds.includes(activityId)
        ? prev.activityIds.filter(id => id !== activityId)
        : [...prev.activityIds, activityId],
    }));
  };

  const sectionTypeLabels: Record<string, string> = {
    activities: "Aktiviteler",
    package_tours: "Paket Turlar",
    destinations: "Destinasyonlar",
  };

  if (sectionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Anasayfa Bölümleri</h3>
          <p className="text-sm text-muted-foreground">
            Anasayfada gösterilecek aktivite bölümlerini yönetin
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-section">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Bölüm Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? "Bölümü Düzenle" : "Yeni Bölüm Ekle"}
              </DialogTitle>
              <DialogDescription>
                Anasayfada gösterilecek aktivite bölümü oluşturun
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Başlık (TR)</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Popüler Aktiviteler"
                    data-testid="input-section-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Başlık (EN)</Label>
                  <Input
                    value={formData.titleEn}
                    onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                    placeholder="Popular Activities"
                    data-testid="input-section-title-en"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alt Başlık (TR)</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="En çok tercih edilen turlarımız"
                    data-testid="input-section-subtitle"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alt Başlık (EN)</Label>
                  <Input
                    value={formData.subtitleEn}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitleEn: e.target.value }))}
                    placeholder="Our most popular tours"
                    data-testid="input-section-subtitle-en"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bölüm Tipi</Label>
                  <Select
                    value={formData.sectionType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sectionType: value }))}
                  >
                    <SelectTrigger data-testid="select-section-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activities">Aktiviteler</SelectItem>
                      <SelectItem value="package_tours">Paket Turlar</SelectItem>
                      <SelectItem value="destinations">Destinasyonlar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sıra</Label>
                  <Input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                    data-testid="input-section-order"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maks. Öğe</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={formData.maxItems}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxItems: parseInt(e.target.value) || 6 }))}
                    data-testid="input-section-max-items"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-section-active"
                />
                <Label>Aktif</Label>
              </div>

              <div className="space-y-2">
                <Label>Gösterilecek Aktiviteler</Label>
                <p className="text-xs text-muted-foreground">
                  Hiç seçim yapmazsanız tüm aktiviteler gösterilir (maks. öğe sayısı kadar)
                </p>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {activities?.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.activityIds.includes(activity.id)
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleActivity(activity.id)}
                      data-testid={`activity-select-${activity.id}`}
                    >
                      {activity.imageUrl && (
                        <img
                          src={activity.imageUrl}
                          alt={activity.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <span className="flex-1">{activity.name}</span>
                      {formData.activityIds.includes(activity.id) && (
                        <Badge variant="secondary">Seçili</Badge>
                      )}
                    </div>
                  ))}
                  {(!activities || activities.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      Henüz aktivite bulunmuyor
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  data-testid="button-cancel-section"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-section"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingSection ? "Güncelle" : "Oluştur"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {sections?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz anasayfa bölümü eklenmemiş</p>
              <p className="text-sm">Yukarıdaki butonu kullanarak yeni bölüm ekleyin</p>
            </CardContent>
          </Card>
        )}

        {sections?.map((section) => (
          <Card key={section.id} className="relative">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{section.title}</span>
                    {section.titleEn && (
                      <Badge variant="outline" className="text-xs">EN: {section.titleEn}</Badge>
                    )}
                    <Badge variant={section.isActive ? "default" : "secondary"}>
                      {section.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    <Badge variant="outline">
                      {sectionTypeLabels[section.sectionType] || section.sectionType}
                    </Badge>
                  </div>
                  {section.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">{section.subtitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Sıra: {section.displayOrder} | Maks: {section.maxItems} öğe | 
                    {safeParseIds(section.activityIds).length > 0 
                      ? ` ${safeParseIds(section.activityIds).length} aktivite seçili`
                      : " Tüm aktiviteler"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(section)}
                    data-testid={`button-edit-section-${section.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Bu bölümü silmek istediğinize emin misiniz?")) {
                        deleteMutation.mutate(section.id);
                      }
                    }}
                    data-testid={`button-delete-section-${section.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
