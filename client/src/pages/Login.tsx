import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
    companyName: string;
    membershipType: string;
    membershipEndDate: string | null;
  };
  permissions: string[];
  roles: number[];
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      
      toast({
        title: "Giris Basarili",
        description: `Hosgeldiniz, ${data.user.name || data.user.username}!`,
      });
      
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Giris Hatasi",
        description: error.message || "Kullanici adi veya sifre hatali",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Eksik Bilgi",
        description: "Lutfen kullanici adi ve sifre giriniz",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Smartur</CardTitle>
          <CardDescription>
            Rezervasyon ve Operasyon Yonetim Sistemi
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanici Adi</Label>
              <Input
                id="username"
                type="text"
                placeholder="Kullanici adinizi giriniz"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
                autoComplete="username"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Sifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sifrenizi giriniz"
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
                  Giris yapiliyor...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Giris Yap
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Hesabiniz yok mu? Super Admin ile iletisime gecin.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
