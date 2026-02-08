import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, Loader2, Link as LinkIcon, Images } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  size: "small" | "large";
  placeholder?: string;
  recommendedSize?: string;
  disabled?: boolean;
}

interface GalleryImage {
  id: string;
  mimetype: string;
  sizeKb: number | null;
  originalName: string | null;
  createdAt: string | null;
}

export function ImageUpload({
  value,
  onChange,
  label,
  size,
  placeholder = "https://example.com/image.png",
  recommendedSize,
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const endpoint = size === "small" ? "/api/upload/small" : "/api/upload/large";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/webp", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Hata",
        description: "Sadece PNG, WebP ve JPEG formatları kabul edilir",
        variant: "destructive",
      });
      return;
    }

    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > 10240) {
      toast({
        title: "Hata",
        description: `Dosya boyutu çok büyük. Maksimum 10MB olmalı. (Mevcut: ${Math.round(fileSizeKB)}KB)`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Yükleme başarısız");
      }

      const data = await response.json();
      onChange(data.url);
      const compressionInfo = data.originalSize && data.compressedSize
        ? ` (${data.originalSize}KB → ${data.compressedSize}KB)`
        : "";
      toast({
        title: "Başarılı",
        description: `Görsel yüklendi${compressionInfo}`,
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Görsel yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const handleGallerySelect = (id: string) => {
    onChange(`/api/images/${id}.webp`);
    setShowGallery(false);
    toast({
      title: "Seçildi",
      description: "Galeriden görsel seçildi.",
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="flex gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.webp,.jpg,.jpeg,image/png,image/webp,image/jpeg"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
          data-testid={`input-file-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          data-testid={`button-upload-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {isUploading ? "Yükleniyor..." : "Görsel Yükle"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowGallery(true)}
          disabled={disabled}
          data-testid={`button-gallery-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <Images className="w-4 h-4 mr-2" />
          Galeriden Seç
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={disabled}
          data-testid={`button-url-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          URL Gir
        </Button>
        
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            data-testid={`button-remove-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <X className="w-4 h-4 mr-2" />
            Kaldır
          </Button>
        )}
      </div>
      
      {showUrlInput && (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          data-testid={`input-url-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      )}
      
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-primary">
          {recommendedSize && `Önerilen boyut: ${recommendedSize} | `}
          PNG, WebP, JPEG | Otomatik sıkıştırma ve boyutlandırma
        </span>
      </p>
      
      {value && (
        <div className="mt-2 p-4 border rounded-lg bg-muted/50">
          <img
            src={value}
            alt={`${label} önizleme`}
            className="max-h-32 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <GalleryPickerDialog
        open={showGallery}
        onOpenChange={setShowGallery}
        onSelect={handleGallerySelect}
        currentValue={value}
      />
    </div>
  );
}

interface GalleryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  currentValue: string;
}

function GalleryPickerDialog({ open, onOpenChange, onSelect, currentValue }: GalleryPickerDialogProps) {
  const { data: images, isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["/api/uploaded-images"],
    enabled: open,
  });

  const currentImageId = currentValue?.match(/\/api\/images\/([^.]+)/)?.[1] || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Galeriden Görsel Seç
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : !images || images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Images className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Henüz görsel yüklenmemiş</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Önce bir görsel yükleyin, sonra galeriden seçebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
              {images.map((img) => {
                const isSelected = currentImageId === img.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => onSelect(img.id)}
                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    data-testid={`gallery-pick-${img.id}`}
                  >
                    <img
                      src={`/api/images/${img.id}.webp`}
                      alt={img.originalName || "Görsel"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                      <p className="text-[10px] text-white truncate">
                        {img.originalName || "Adsız"}
                      </p>
                      <p className="text-[9px] text-white/70">
                        {img.sizeKb ? `${img.sizeKb} KB` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
