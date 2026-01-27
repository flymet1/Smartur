import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md mx-4 border-0 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-xl font-semibold text-muted-foreground mb-4">
            Sayfa Bulunamadı
          </h2>

          <p className="text-sm text-muted-foreground mb-6">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>

          <Link href="/">
            <Button className="gap-2" data-testid="button-go-home">
              <Home className="h-4 w-4" />
              Anasayfaya Dön
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
