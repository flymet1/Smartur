import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  size: "small" | "large";
  placeholder?: string;
  recommendedSize?: string;
  disabled?: boolean;
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

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="flex gap-2">
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
    </div>
  );
}
