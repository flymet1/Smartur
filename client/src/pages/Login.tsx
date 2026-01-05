import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Eye, EyeOff, Loader2, Phone, Mail } from "lucide-react";

interface BrandSettings {
  companyName?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
}

interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
    companyName: string;
    membershipType: string;
    membershipEndDate: string | null;
    tenantId: number | null;
  };
  permissions: string[];
  roles: number[];
  tenant: TenantInfo | null;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fetch brand settings for logo
  const { data: brandSettingsData } = useQuery<{ key: string; value?: string }>({
    queryKey: ["/api/settings/brandSettings"],
  });

  const brandSettings: BrandSettings = brandSettingsData?.value 
    ? JSON.parse(brandSettingsData.value) 
    : {};

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return await response.json() as LoginResponse;
    },
    onSuccess: (data) => {
      localStorage.setItem("userToken", JSON.stringify(data.user.id));
      localStorage.setItem("userData", JSON.stringify(data.user));
      localStorage.setItem("userPermissions", JSON.stringify(data.permissions));
      localStorage.setItem("userRoles", JSON.stringify(data.roles));
      
      // Store tenant information for multi-tenant context
      if (data.tenant) {
        localStorage.setItem("tenantData", JSON.stringify(data.tenant));
      }
      
      toast({
        title: "Giriş Başarılı",
        description: `Hosgeldiniz, ${data.user.name || data.user.username}!`,
      });
      
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Giriş Hatası",
        description: error.message || "Kullanıcı adi veya şifre hatali",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Eksik Bilgi",
        description: "Lutfen kullanıcı adi ve şifre giriniz",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted p-4">
      {/* Logo in top left corner */}
      {brandSettings.logoUrl && (
        <div className="absolute top-4 left-4">
          <img 
            src={brandSettings.logoUrl} 
            alt="Logo" 
            className="h-12 w-auto object-contain"
            data-testid="img-brand-logo"
          />
        </div>
      )}
      
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              {brandSettings.logoUrl ? (
                <img 
                  src={brandSettings.logoUrl} 
                  alt="Logo" 
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <LogIn className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {brandSettings.companyName || "Smartur"}
            </CardTitle>
            <CardDescription>
              Rezervasyon ve Operasyon Yönetim Sistemi
            </CardDescription>
          </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                type="text"
                placeholder="Kullanıcı adinizi giriniz"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
                autoComplete="username"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifrenizi giriniz"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapiliyor...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Giriş Yap
                </>
              )}
            </Button>
            
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                Hesabıniz yok mu? Planlar ve abonelik için Smartur ekibi ile iletişime gecin.
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  05302885515
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  mysmartur@gmail.com
                </span>
              </div>
            </div>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  );
}
