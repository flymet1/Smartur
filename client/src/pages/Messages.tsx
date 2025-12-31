import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";

export default function Messages() {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Mesaj Geçmişi</h1>
          <p className="text-muted-foreground mt-1">Bot ile yapılan son görüşmeler</p>
        </div>

        <div className="grid gap-4">
          {/* Mock data for now */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold">+90 532 123 45 67</h3>
                <p className="text-xs text-muted-foreground">Bugün, 14:30</p>
              </div>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                Bot Yanıtladı
              </span>
            </div>
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
              <p className="text-sm"><span className="font-bold">Kullanıcı:</span> Merhaba, yarın ATV turu var mı?</p>
              <p className="text-sm text-primary"><span className="font-bold">Bot:</span> Merhaba! Evet, yarın (15 Mayıs) için ATV turu müsaitliğimiz var. Saat 10:00 ve 14:00 slotları boş. Kaç kişi için rezervasyon yapmak istersiniz?</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold">+90 555 987 65 43</h3>
                <p className="text-xs text-muted-foreground">Dün, 18:15</p>
              </div>
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                İnsan Müdahalesi Gerekiyor
              </span>
            </div>
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
              <p className="text-sm"><span className="font-bold">Kullanıcı:</span> Grup indirimi yapıyor musunuz? 20 kişi geleceğiz.</p>
              <p className="text-sm text-primary"><span className="font-bold">Bot:</span> Bu konuyu yetkili arkadaşıma iletiyorum, size kısa sürede dönüş yapacaklar.</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
