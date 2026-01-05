import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/takip", "/sales-presentation", "/super-admin"];

export function AuthGuard({ children }: AuthGuardProps) {
  const [location, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isPublicRoute = PUBLIC_ROUTES.some(route => 
        location === route || location.startsWith(route + "/") || location.startsWith("/takip/")
      );

      if (isPublicRoute) {
        setIsChecking(false);
        setIsAuthenticated(true);
        return;
      }

      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            localStorage.setItem("userToken", JSON.stringify(data.user.id));
            localStorage.setItem("userData", JSON.stringify(data.user));
            if (data.permissions) {
              localStorage.setItem("userPermissions", JSON.stringify(data.permissions));
            }
            if (data.roles) {
              localStorage.setItem("userRoles", JSON.stringify(data.roles));
            }
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("userToken");
            localStorage.removeItem("userData");
            localStorage.removeItem("userPermissions");
            localStorage.removeItem("userRoles");
            localStorage.removeItem("tenantData");
            setIsAuthenticated(false);
            setLocation("/login");
          }
        } else {
          localStorage.removeItem("userToken");
          localStorage.removeItem("userData");
          localStorage.removeItem("userPermissions");
          localStorage.removeItem("userRoles");
          localStorage.removeItem("tenantData");
          setIsAuthenticated(false);
          setLocation("/login");
        }
      } catch {
        const userData = localStorage.getItem("userData");
        if (userData) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setLocation("/login");
        }
      }
      
      setIsChecking(false);
    };

    checkAuth();
  }, [location, setLocation]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Oturum kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch {
  }
  
  localStorage.removeItem("userToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("userPermissions");
  localStorage.removeItem("userRoles");
  localStorage.removeItem("tenantData");
  
  window.location.href = "/login";
}
