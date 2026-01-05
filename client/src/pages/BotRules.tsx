import { useEffect } from "react";
import { useLocation } from "wouter";

export default function BotRules() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/super-admin");
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20">
      <div className="text-muted-foreground">Süper Admin paneline yönlendiriliyorsunuz...</div>
    </div>
  );
}
