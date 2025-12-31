import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export default function Settings() {
  const [reminderMinutes, setReminderMinutes] = useState(1440); // 24 hours * 60 minutes
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours} saat ${mins} dakika`;
    } else if (hours > 0) {
      return `${hours} saat`;
    } else {
      return `${mins} dakika`;
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display">Ayarlar</h1>
          <p className="text-muted-foreground mt-1">Sistem yapılandırması</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Otomasyon Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Otomatik Onay Mesajı</Label>
                  <p className="text-sm text-muted-foreground">Rezervasyon oluştuğunda müşteriye WhatsApp mesajı gönder</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <Label>Hatırlatma Mesajı</Label>
                    <p className="text-sm text-muted-foreground">Aktiviteye belirtilen süre kala hatırlatma gönder</p>
                  </div>
                  <Switch 
                    checked={reminderEnabled} 
                    onCheckedChange={setReminderEnabled}
                  />
                </div>
                
                {reminderEnabled && (
                  <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="reminderMinutes">Kaç dakika kala hatırlatma yapılsın?</Label>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input 
                            id="reminderMinutes"
                            type="number" 
                            min="1"
                            value={reminderMinutes}
                            onChange={(e) => setReminderMinutes(Math.max(1, Number(e.target.value)))}
                            placeholder="Dakika cinsinden girin..."
                          />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                          = {formatTime(reminderMinutes)}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Örnek: 1440 = 24 saat, 60 = 1 saat, 30 = 30 dakika
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WooCommerce Entegrasyonu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value="https://api.domain.com/api/webhooks/woocommerce" className="bg-muted" />
                  <Button variant="outline">Kopyala</Button>
                </div>
                <p className="text-xs text-muted-foreground">Bu URL'i WooCommerce ayarlarınıza ekleyin.</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
