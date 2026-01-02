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
  Globe
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
            Sistem fonksiyonları, WhatsApp bot ve admin panel kullanım rehberi
          </p>
        </div>

        <div className="space-y-8">
          <Section 
            icon={<Globe className="h-5 w-5" />}
            title="1. Sistem Genel Bakış"
            id="genel-bakis"
          >
            <p className="text-muted-foreground mb-4">
              Bu sistem, tur ve aktivite operasyonlarınızı yönetmek için tasarlanmış kapsamlı bir platformdur.
              WooCommerce web sitesi entegrasyonu ve WhatsApp bot desteği ile müşterilerinize 7/24 hizmet verebilirsiniz.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard 
                icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
                title="WooCommerce Entegrasyonu"
                description="Web sitenizdeki siparişler otomatik olarak sisteme akar. Ödemesi yapılmış siparişler 'Onaylı' durumunda kaydedilir."
              />
              <FeatureCard 
                icon={<MessageCircle className="h-5 w-5 text-green-500" />}
                title="WhatsApp Bot"
                description="Müşteri sorularını otomatik yanıtlar, müsaitlik bilgisi verir ve web sitesine yönlendirir."
              />
              <FeatureCard 
                icon={<Calendar className="h-5 w-5 text-orange-500" />}
                title="Takvim & Kapasite"
                description="Aktiviteler için günlük kapasite tanımı, müsaitlik takibi ve rezervasyon yönetimi."
              />
              <FeatureCard 
                icon={<CreditCard className="h-5 w-5 text-purple-500" />}
                title="Finans Modülü"
                description="Acenta ödemeleri, tedarikçi maliyetleri ve hesaplaşma takibi."
              />
            </div>
          </Section>

          <Section 
            icon={<Bot className="h-5 w-5" />}
            title="2. WhatsApp Bot Sistemi"
            id="whatsapp-bot"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Temel Çalışma Prensibi
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Bot, Twilio WhatsApp API üzerinden gelen mesajları alır</li>
                  <li>Google Gemini AI ile akıllı yanıtlar üretir</li>
                  <li>Aktivite bilgileri, fiyatlar ve müsaitlik verileri AI'a aktarılır</li>
                  <li>Bot sadece bilgi verir, <strong>asla rezervasyon oluşturmaz</strong></li>
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Önemli Kural: Rezervasyon Politikası
                </h4>
                <p className="text-sm text-muted-foreground">
                  Bot asla doğrudan rezervasyon oluşturmaz. Ön ödeme olmadan rezervasyon alınmaz. 
                  Müsaitlik varsa müşteriye "Müsaitlik mevcut, rezervasyonunuzu web sitemizden oluşturabilirsiniz" 
                  diyerek ilgili aktivitenin rezervasyon linkini paylaşır.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Müsaitlik Kontrolü
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Bot, takvimde tanımlı kapasiteleri ve varsayılan slotları kontrol eder</li>
                  <li>Mevcut rezervasyonları düşürerek gerçek müsaitliği hesaplar</li>
                  <li>7 günlük ileriye dönük kapasite bilgisi AI'a aktarılır</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  Dinamik Tarih Algılama
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Bot şu Türkçe tarih ifadelerini anlar:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">bugün</Badge>
                  <Badge variant="secondary">yarın</Badge>
                  <Badge variant="secondary">hafta sonu</Badge>
                  <Badge variant="secondary">5 şubat</Badge>
                  <Badge variant="secondary">15.01</Badge>
                  <Badge variant="secondary">gelecek pazartesi</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Tatil ve Bayram Algılama
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  "Tatiller" sayfasında tanımlı bayram ve tatiller için bot otomatik tarih eşleştirmesi yapar:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">bayramda müsait misiniz?</Badge>
                  <Badge variant="secondary">kurban bayramı</Badge>
                  <Badge variant="secondary">ramazan bayramı</Badge>
                  <Badge variant="secondary">yılbaşında</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-500" />
                  Eskalasyon Kuralları
                </h4>
                <p className="text-sm text-muted-foreground">
                  Bot şu durumlarda müşteriyi yetkili personele yönlendirir:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                  <li>Karmaşık konular veya şikayetler</li>
                  <li>2 mesaj içinde çözülemeyen sorunlar</li>
                  <li>Fiyat indirimi, grup indirimi talepleri</li>
                  <li>Müşteri "operatör", "beni arayın" gibi ifadeler kullandığında</li>
                  <li>Agresif veya memnuniyetsiz müşteri davranışı</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Dil Desteği</h4>
                <p className="text-sm text-muted-foreground">
                  Bot, müşterinin diliyle (Türkçe/İngilizce) iletişim kurar. İngilizce konuşmalarda 
                  aktivitelerin İngilizce rezervasyon linkini kullanır.
                </p>
              </div>
            </div>
          </Section>

          <Section 
            icon={<Settings className="h-5 w-5" />}
            title="3. Admin Panel Kullanımı"
            id="admin-panel"
          >
            <div className="space-y-4">
              <AdminPageGuide 
                title="Genel Bakış (Dashboard)"
                description="Günlük rezervasyon özeti, yaklaşan aktiviteler ve temel istatistikler."
              />
              <AdminPageGuide 
                title="Takvim & Kapasite"
                description="Aktiviteler için günlük/saatlik kapasite tanımlama. Varsayılan kapasiteler aktivite ayarlarından gelir, özel günler için manuel düzenleme yapılabilir."
              />
              <AdminPageGuide 
                title="Rezervasyonlar"
                description="Tüm rezervasyonları listeler. WooCommerce'den gelenler otomatik 'Onaylı' durumundadır. Durum değişikliği, iptal ve düzenleme yapılabilir."
              />
              <AdminPageGuide 
                title="Aktiviteler"
                description="Tur ve aktivite tanımları. Fiyat, süre, varsayılan saat/kapasite, onay mesajı, rezervasyon linki ve SSS tanımları burada yapılır."
              />
              <AdminPageGuide 
                title="Paket Turlar"
                description="Birden fazla aktiviteyi içeren paket tur tanımları. Gün bazlı aktivite sıralaması ve fiyatlandırma."
              />
              <AdminPageGuide 
                title="Tatiller"
                description="Resmi tatil ve dini bayram tanımları. Bot bu tarihleri 'bayramda müsait misiniz?' gibi sorularda kullanır."
              />
              <AdminPageGuide 
                title="Finans & Acentalar"
                description="Tedarikçi maliyetleri, acenta ödemeleri ve hesaplaşma takibi."
              />
              <AdminPageGuide 
                title="Bot Test"
                description="WhatsApp bot'u test etmek için simülasyon alanı. Gerçek API'ye bağlanmadan bot yanıtlarını test edin."
              />
              <AdminPageGuide 
                title="Mesaj Geçmişi"
                description="WhatsApp üzerinden gelen tüm mesajlar ve bot yanıtları. Müşteri bazlı filtreleme ve arama."
              />
              <AdminPageGuide 
                title="Bot Kuralları"
                description="Bot'un davranış kurallarını özelleştirebileceğiniz alan. Şifre korumalıdır (varsayılan: Netim1905)."
              />
              <AdminPageGuide 
                title="Ayarlar"
                description="Sistem ayarları, logo yükleme ve genel konfigürasyonlar."
              />
            </div>
          </Section>

          <Section 
            icon={<ShoppingCart className="h-5 w-5" />}
            title="4. WooCommerce Entegrasyonu"
            id="woocommerce"
          >
            <div className="space-y-4">
              <p className="text-muted-foreground">
                WooCommerce web sitesinden gelen siparişler webhook aracılığıyla otomatik olarak sisteme akar.
              </p>
              
              <div>
                <h4 className="font-semibold mb-2">Sipariş Akışı</h4>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Müşteri web sitesinden rezervasyon yapar ve ödeme tamamlar</li>
                  <li>WooCommerce webhook tetiklenir ve sipariş sisteme iletilir</li>
                  <li>Sistem, ürün adını aktivite/paket tur ile eşleştirir</li>
                  <li>Rezervasyon <strong>"Onaylı"</strong> durumunda oluşturulur</li>
                  <li>Aktivitenin onay mesajı müşteriye (WhatsApp veya email ile) gönderilebilir</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Para Birimi Desteği</h4>
                <p className="text-muted-foreground">
                  Sistem TRY ve USD para birimlerini destekler. WooCommerce siparişindeki para birimine göre 
                  fiyat otomatik olarak ilgili alana (priceTl veya priceUsd) kaydedilir.
                </p>
              </div>
            </div>
          </Section>

          <Section 
            icon={<Clock className="h-5 w-5" />}
            title="5. Güncelleme Geçmişi"
            id="guncellemeler"
          >
            <div className="space-y-4">
              <UpdateEntry 
                date="02.01.2026"
                title="Bot Rezervasyon Kuralı Eklendi"
                description="Bot asla doğrudan rezervasyon oluşturmaz. Müsaitlik varsa web sitesi linkini paylaşarak yönlendirir. Ön ödeme olmadan rezervasyon alınmaz."
                type="kural"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Tatil/Bayram Algılama"
                description="Bot artık 'bayramda müsait misiniz?', 'kurban bayramı' gibi ifadeleri anlıyor ve ilgili tarihlerin kapasitesini kontrol ediyor."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Dinamik Tarih Algılama"
                description="Bot 'yarın', '5 şubat', 'hafta sonu', '15.01' gibi Türkçe tarih ifadelerini anlıyor."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Anahtar Kelime Girişi Kolaylaştırıldı"
                description="Tatil eklerken anahtar kelimeler artık virgül ile ayrılarak girilebilir (JSON formatına gerek yok)."
                type="iyilestirme"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="WooCommerce Siparişleri Otomatik Onaylı"
                description="Web sitesinden gelen ve ödemesi yapılmış siparişler artık 'Onaylı' durumunda kaydediliyor."
                type="ozellik"
              />
              <UpdateEntry 
                date="31.12.2025"
                title="Finans & Acenta Modülü"
                description="Aktivite maliyetleri, KDV hesaplaması, acenta ödemeleri ve hesaplaşma takibi eklendi."
                type="ozellik"
              />
              <UpdateEntry 
                date="31.12.2025"
                title="Proje Başlangıcı"
                description="Temel altyapı kuruldu: Aktivite yönetimi, rezervasyonlar, takvim, WhatsApp bot entegrasyonu."
                type="ozellik"
              />
            </div>
          </Section>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-8 border-t">
          Bu kılavuz sistem güncellemeleriyle birlikte güncellenmektedir.
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
