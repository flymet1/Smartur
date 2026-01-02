import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Bot, 
  Calendar, 
  CreditCard, 
  MessageCircle, 
  Settings, 
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Zap,
  HelpCircle,
  Search,
  Bell,
  Shield,
  BarChart3,
  FileText,
  Languages
} from "lucide-react";

export default function UserGuide() {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-3" data-testid="text-page-title">
            <BookOpen className="h-8 w-8 text-primary" />
            Kullanım Kılavuzu
          </h1>
          <p className="text-muted-foreground mt-2">
            Rezervasyon sisteminizi en verimli şekilde kullanmak için rehber
          </p>
        </div>

        <div className="space-y-8">
          <Section 
            icon={<Globe className="h-5 w-5" />}
            title="1. Sisteme Hoş Geldiniz"
            id="hos-geldiniz"
          >
            <p className="text-muted-foreground mb-4">
              Bu sistem, tur ve aktivite operasyonlarınızı kolayca yönetmenizi sağlar.
              Web sitenizden gelen siparişler otomatik olarak sisteme akar ve WhatsApp botunuz 
              müşterilerinize 7/24 hizmet verir.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard 
                icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
                title="Otomatik Sipariş Aktarımı"
                description="Web sitenizdeki siparişler anında sisteme aktarılır. Ödemesi tamamlanan siparişler otomatik onaylanır."
              />
              <FeatureCard 
                icon={<MessageCircle className="h-5 w-5 text-green-500" />}
                title="Akıllı WhatsApp Asistanı"
                description="Müşteri sorularını otomatik yanıtlar, müsaitlik bilgisi verir ve rezervasyon için yönlendirir."
              />
              <FeatureCard 
                icon={<Calendar className="h-5 w-5 text-orange-500" />}
                title="Takvim & Kapasite"
                description="Aktiviteleriniz için günlük kapasite tanımlayın, doluluk oranlarını takip edin."
              />
              <FeatureCard 
                icon={<CreditCard className="h-5 w-5 text-purple-500" />}
                title="Finansal Takip"
                description="Acenta ödemeleri, tedarikçi maliyetleri ve hesaplaşmalarınızı tek yerden yönetin."
              />
            </div>
          </Section>

          <Section 
            icon={<Bot className="h-5 w-5" />}
            title="2. WhatsApp Asistanınız"
            id="whatsapp-asistan"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Neler Yapabilir?
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Aktiviteleriniz hakkında bilgi verir (fiyat, süre, detaylar)</li>
                  <li>Müsaitlik durumunu kontrol eder ve bildirir</li>
                  <li>Müşterileri rezervasyon için web sitenize yönlendirir</li>
                  <li>Sık sorulan soruları otomatik yanıtlar</li>
                  <li>Karmaşık konularda size yönlendirir</li>
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Önemli: Rezervasyon Politikası
                </h4>
                <p className="text-sm text-muted-foreground">
                  Asistan asla doğrudan rezervasyon almaz. Müsaitlik varsa müşteriye web sitenizdeki 
                  rezervasyon linkini paylaşarak ödeme yapmasını sağlar. Böylece tüm rezervasyonlarınız 
                  güvenli ve ödemeli şekilde alınır.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Tarih Anlama Özelliği
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Asistan şu ifadeleri anlayarak doğru tarihlerin müsaitliğini kontrol eder:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">bugün</Badge>
                  <Badge variant="secondary">yarın</Badge>
                  <Badge variant="secondary">hafta sonu</Badge>
                  <Badge variant="secondary">5 şubat</Badge>
                  <Badge variant="secondary">gelecek pazartesi</Badge>
                  <Badge variant="secondary">kurban bayramı</Badge>
                  <Badge variant="secondary">yılbaşında</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-purple-500" />
                  Çok Dilli Destek
                </h4>
                <p className="text-sm text-muted-foreground">
                  Asistan, müşterinin kullandığı dile göre Türkçe veya İngilizce yanıt verir.
                  Yabancı müşterilerinize de profesyonel hizmet sunabilirsiniz.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-500" />
                  Size Yönlendirme
                </h4>
                <p className="text-sm text-muted-foreground">
                  Asistan şu durumlarda müşteriyi size yönlendirir ve bildirim gönderir:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                  <li>Şikayet veya özel talepler</li>
                  <li>Fiyat indirimi, grup indirimi istekleri</li>
                  <li>Müşteri "beni arayın" veya "operatör" dediğinde</li>
                  <li>2 mesajda çözülemeyen sorular</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section 
            icon={<Zap className="h-5 w-5" />}
            title="3. Otomatik Yanıtlar (Maliyet Tasarrufu)"
            id="otomatik-yanitlar"
          >
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Sık sorulan sorular için otomatik yanıt kuralları tanımlayabilirsiniz. 
                Bu yanıtlar yapay zeka kullanmadan anında verilir, böylece hem maliyet 
                tasarrufu sağlar hem de daha hızlı yanıt verilir.
              </p>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Nasıl Çalışır?
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ayarlar sayfasında "Otomatik Yanıtlar" bölümünden kurallar ekleyin</li>
                  <li>Anahtar kelimeler tanımlayın (örn: "transfer", "havalimanı")</li>
                  <li>Türkçe ve İngilizce için ayrı yanıtlar belirleyin</li>
                  <li>Müşteri bu kelimeleri kullandığında otomatik yanıt gider</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Örnek Kullanım Alanları:</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Transfer Bilgisi</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "transfer, havalimanı"</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Çalışma Saatleri</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "saat, kaçta, açık mı"</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">İptal Politikası</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "iptal, iade"</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Ödeme Bilgisi</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "ödeme, kredi kartı"</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section 
            icon={<BarChart3 className="h-5 w-5" />}
            title="4. Panel Sayfaları"
            id="panel-sayfalari"
          >
            <div className="space-y-4">
              <AdminPageGuide 
                title="Genel Bakış"
                description="Günlük rezervasyon özeti, bugünkü aktiviteler ve temel istatistikler. Günün durumunu tek bakışta görün."
              />
              <AdminPageGuide 
                title="Takvim"
                description="Aktivitelerinizin günlük kapasitesini görün ve düzenleyin. Hangi günlerde boşluk var, hangi günler dolu anında görün."
              />
              <AdminPageGuide 
                title="Rezervasyonlar"
                description="Tüm rezervasyonlarınızı listeleyin, filtreleyin ve yönetin. Sipariş numarası, müşteri adı veya telefon ile arama yapın."
              />
              <AdminPageGuide 
                title="Aktiviteler"
                description="Turlarınızı ve aktivitelerinizi tanımlayın. Fiyat, süre, kapasite ve rezervasyon linklerini buradan ayarlayın."
              />
              <AdminPageGuide 
                title="Paket Turlar"
                description="Birden fazla aktiviteyi içeren paket programlarınızı oluşturun. Gün bazlı aktivite planlaması yapın."
              />
              <AdminPageGuide 
                title="Tatiller"
                description="Resmi tatil ve bayramları tanımlayın. Asistan 'bayramda müsait misiniz?' gibi sorularda bu tarihleri kullanır."
              />
              <AdminPageGuide 
                title="Finans"
                description="Tedarikçi maliyetleri, acenta ödemeleri ve hesaplaşma takibi. Finansal durumunuzu takip edin."
              />
              <AdminPageGuide 
                title="Mesajlar"
                description="WhatsApp üzerinden gelen tüm mesajları ve asistan yanıtlarını görün. Müşteri geçmişini inceleyin."
              />
              <AdminPageGuide 
                title="Raporlar"
                description="Aktivite bazlı satış raporları, doluluk oranları ve performans analizi."
              />
              <AdminPageGuide 
                title="Ayarlar"
                description="Sistem ayarlarınızı düzenleyin: Logo, WhatsApp botu, otomatik yanıtlar ve entegrasyonlar."
              />
            </div>
          </Section>

          <Section 
            icon={<Settings className="h-5 w-5" />}
            title="5. Ayarlar Sayfası"
            id="ayarlar"
          >
            <div className="space-y-4">
              <p className="text-muted-foreground mb-4">
                Ayarlar sayfası dört ana bölüme ayrılmıştır:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold">Güvenlik</h4>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Panel giriş bilgileri</li>
                    <li>E-posta ayarları</li>
                    <li>Logo yükleme</li>
                  </ul>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold">WhatsApp</h4>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Bot ayarları</li>
                    <li>Otomatik mesajlar</li>
                    <li>Kara liste yönetimi</li>
                  </ul>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-5 w-5 text-orange-500" />
                    <h4 className="font-semibold">Entegrasyonlar</h4>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>WooCommerce bağlantısı</li>
                    <li>Otomatik yanıt kuralları</li>
                  </ul>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold">Sistem</h4>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Sürüm bilgisi</li>
                    <li>Güncelleme kontrolü</li>
                    <li>Hata raporu oluşturma</li>
                  </ul>
                </div>
              </div>
            </div>
          </Section>

          <Section 
            icon={<HelpCircle className="h-5 w-5" />}
            title="6. Sorun Giderme"
            id="sorun-giderme"
          >
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-600">
                  <Search className="h-4 w-4" />
                  Hata Raporu Oluşturma
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Bir sorunla karşılaştığınızda, Ayarlar &gt; Sistem sekmesindeki "Hata Ayıklama" 
                  kartından tek tıkla sistem raporu oluşturabilirsiniz.
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Rapor, sisteminizin durumunu özetler</li>
                  <li>Müşteri bilgileri otomatik olarak gizlenir</li>
                  <li>Raporu geliştiriciye göndererek hızlı destek alabilirsiniz</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Sık Karşılaşılan Durumlar:</h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-sm">WhatsApp mesajları gelmiyor</p>
                    <p className="text-xs text-muted-foreground">Twilio bağlantınızı kontrol edin. Ayarlar &gt; WhatsApp sekmesinden durumu görün.</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-sm">Sipariş otomatik gelmiyor</p>
                    <p className="text-xs text-muted-foreground">WooCommerce webhook ayarlarınızı kontrol edin. Doğru URL girildiğinden emin olun.</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-sm">Bot yanlış bilgi veriyor</p>
                    <p className="text-xs text-muted-foreground">Aktivite bilgilerini güncelleyin. SSS bölümlerine doğru bilgileri ekleyin.</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section 
            icon={<Bell className="h-5 w-5" />}
            title="7. Son Güncellemeler"
            id="guncellemeler"
          >
            <div className="space-y-4">
              <UpdateEntry 
                date="02.01.2026"
                title="Yeni Ayarlar Düzeni"
                description="Ayarlar sayfası 4 kategoriye ayrıldı: Güvenlik, WhatsApp, Entegrasyonlar, Sistem. Daha kolay kullanım."
                type="iyilestirme"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Hata Raporu Özelliği"
                description="Tek tıkla sistem durumu raporu oluşturun. Sorunları hızlıca çözün."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="İki Dilli Otomatik Yanıtlar"
                description="Otomatik yanıtlarda Türkçe ve İngilizce için ayrı mesajlar tanımlayabilirsiniz."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Otomatik Yanıt Sistemi"
                description="Sık sorulan sorular için maliyet tasarruflu otomatik yanıtlar. Yapay zeka kullanmadan hızlı cevap."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Tatil/Bayram Algılama"
                description="Asistan artık 'bayramda müsait misiniz?' gibi soruları anlıyor."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Sipariş Numarası Takibi"
                description="Rezervasyonlarda sipariş numarası ile arama ve takip."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Takvim-Rezervasyon Bağlantısı"
                description="Takvimden tek tıkla o günün rezervasyonlarını görün."
                type="iyilestirme"
              />
              <UpdateEntry 
                date="31.12.2025"
                title="Finans Modülü"
                description="Tedarikçi maliyetleri, acenta ödemeleri ve hesaplaşma takibi."
                type="ozellik"
              />
            </div>
          </Section>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-8 border-t">
          Sorularınız için destek ekibimizle iletişime geçebilirsiniz.
        </div>
      </main>
    </div>
  );
}

function Section({ icon, title, id, children }: { icon: React.ReactNode; title: string; id: string; children: React.ReactNode }) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AdminPageGuide({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function UpdateEntry({ date, title, description, type }: { date: string; title: string; description: string; type: 'ozellik' | 'kural' | 'iyilestirme' | 'duzeltme' }) {
  const typeColors = {
    ozellik: 'bg-green-500/10 text-green-600 border-green-500/20',
    kural: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    iyilestirme: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    duzeltme: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  
  const typeLabels = {
    ozellik: 'Yeni Özellik',
    kural: 'Kural Değişikliği',
    iyilestirme: 'İyileştirme',
    duzeltme: 'Düzeltme',
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">{date}</Badge>
        <Badge className={`text-xs border ${typeColors[type]}`}>{typeLabels[type]}</Badge>
      </div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
