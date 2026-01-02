import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
            Kullanim Kilavuzu
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistem fonksiyonlari, WhatsApp bot ve admin panel kullanim rehberi
          </p>
        </div>

        <div className="space-y-8">
          <Section 
            icon={<Globe className="h-5 w-5" />}
            title="1. Sistem Genel Bakis"
            id="genel-bakis"
          >
            <p className="text-muted-foreground mb-4">
              Bu sistem, tur ve aktivite operasyonlarinizi yonetmek icin tasarlanmis kapsamli bir platformdur.
              WooCommerce web sitesi entegrasyonu ve WhatsApp bot destegi ile musterilerinize 7/24 hizmet verebilirsiniz.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureCard 
                icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
                title="WooCommerce Entegrasyonu"
                description="Web sitenizdeki siparisler otomatik olarak sisteme akar. Odemesi yapilmis siparisler 'Onayli' durumunda kaydedilir."
              />
              <FeatureCard 
                icon={<MessageCircle className="h-5 w-5 text-green-500" />}
                title="WhatsApp Bot"
                description="Musteri sorularini otomatik yanitlar, musaitlik bilgisi verir ve web sitesine yonlendirir."
              />
              <FeatureCard 
                icon={<Calendar className="h-5 w-5 text-orange-500" />}
                title="Takvim & Kapasite"
                description="Aktiviteler icin gunluk kapasite tanimi, musaitlik takibi ve rezervasyon yonetimi."
              />
              <FeatureCard 
                icon={<CreditCard className="h-5 w-5 text-purple-500" />}
                title="Finans Modulu"
                description="Acenta odemeleri, tedarikci maliyetleri ve hesaplasma takibi."
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
                  Temel Calisma Prensibi
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Bot, Twilio WhatsApp API uzerinden gelen mesajlari alir</li>
                  <li>Google Gemini AI ile akilli yanitlar uretir</li>
                  <li>Aktivite bilgileri, fiyatlar ve musaitlik verileri AI'a aktarilir</li>
                  <li>Bot sadece bilgi verir, <strong>asla rezervasyon olusturmaz</strong></li>
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Onemli Kural: Rezervasyon Politikasi
                </h4>
                <p className="text-sm text-muted-foreground">
                  Bot asla dogrudan rezervasyon olusturmaz. On odeme olmadan rezervasyon alinmaz. 
                  Musaitlik varsa musteriye "Musaitlik mevcut, rezervasyonunuzu web sitemizden olusturabilirsiniz" 
                  diyerek ilgili aktivitenin rezervasyon linkini paylasir.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Musaitlik Kontrolu
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Bot, takvimde tanimli kapasiteleri ve varsayilan slotlari kontrol eder</li>
                  <li>Mevcut rezervasyonlari dusurerek gercek musaitligi hesaplar</li>
                  <li>7 gunluk ileriye donuk kapasite bilgisi AI'a aktarilir</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  Dinamik Tarih Algilama
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Bot su Turkce tarih ifadelerini anlar:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">bugun</Badge>
                  <Badge variant="secondary">yarin</Badge>
                  <Badge variant="secondary">hafta sonu</Badge>
                  <Badge variant="secondary">5 subat</Badge>
                  <Badge variant="secondary">15.01</Badge>
                  <Badge variant="secondary">gelecek pazartesi</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Tatil ve Bayram Algilama
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  "Tatiller" sayfasinda tanimli bayram ve tatiller icin bot otomatik tarih eslestirmesi yapar:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">bayramda musait misiniz?</Badge>
                  <Badge variant="secondary">kurban bayrami</Badge>
                  <Badge variant="secondary">ramazan bayrami</Badge>
                  <Badge variant="secondary">yilbasinda</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-500" />
                  Eskalasyon Kurallari
                </h4>
                <p className="text-sm text-muted-foreground">
                  Bot su durumlarda musteryi yetkili personele yonlendirir:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                  <li>Karmasik konular veya sikayetler</li>
                  <li>2 mesaj icinde cozulemeyen sorunlar</li>
                  <li>Fiyat indirimi, grup indirimi talepleri</li>
                  <li>Musteri "operator", "beni arayin" gibi ifadeler kullandiginda</li>
                  <li>Agresif veya memnuniyetsiz musteri davranisi</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Dil Destegi</h4>
                <p className="text-sm text-muted-foreground">
                  Bot, musterinin diliyle (Turkce/Ingilizce) iletisim kurar. Ingilizce konusmalarda 
                  aktivitelerin Ingilizce rezervasyon linkini kullanir.
                </p>
              </div>
            </div>
          </Section>

          <Section 
            icon={<Settings className="h-5 w-5" />}
            title="3. Admin Panel Kullanimi"
            id="admin-panel"
          >
            <div className="space-y-4">
              <AdminPageGuide 
                title="Genel Bakis (Dashboard)"
                description="Gunluk rezervasyon ozeti, yaklasan aktiviteler ve temel istatistikler."
              />
              <AdminPageGuide 
                title="Takvim & Kapasite"
                description="Aktiviteler icin gunluk/saatlik kapasite tanimlama. Varsayilan kapasiteler aktivite ayarlarindan gelir, ozel gunler icin manuel duzenleme yapilabilir."
              />
              <AdminPageGuide 
                title="Rezervasyonlar"
                description="Tum rezervasyonlari listeler. WooCommerce'den gelenler otomatik 'Onayli' durumundadir. Durum degisikligi, iptal ve duzenleme yapilabilir."
              />
              <AdminPageGuide 
                title="Aktiviteler"
                description="Tur ve aktivite tanimlari. Fiyat, sure, varsayilan saat/kapasite, onay mesaji, rezervasyon linki ve SSS tanimlari burada yapilir."
              />
              <AdminPageGuide 
                title="Paket Turlar"
                description="Birden fazla aktiviteyi iceren paket tur tanimlari. Gun bazli aktivite siralaması ve fiyatlandirma."
              />
              <AdminPageGuide 
                title="Tatiller"
                description="Resmi tatil ve dini bayram tanimlari. Bot bu tarihleri 'bayramda musait misiniz?' gibi sorularda kullanir."
              />
              <AdminPageGuide 
                title="Finans & Acentalar"
                description="Tedarikci maliyetleri, acenta odemeleri ve hesaplasma takibi."
              />
              <AdminPageGuide 
                title="Bot Test"
                description="WhatsApp bot'u test etmek icin simulasyon alani. Gercek API'ye baglanmadan bot yanitlarini test edin."
              />
              <AdminPageGuide 
                title="Mesaj Gecmisi"
                description="WhatsApp uzerinden gelen tum mesajlar ve bot yanitlari. Musteri bazli filtreleme ve arama."
              />
              <AdminPageGuide 
                title="Bot Kurallari"
                description="Bot'un davranis kurallarini ozellestirebileceginiz alan. Sifre korumalıdir (varsayilan: Netim1905)."
              />
              <AdminPageGuide 
                title="Ayarlar"
                description="Sistem ayarlari, logo yukleme ve genel konfigurasyonlar."
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
                WooCommerce web sitesinden gelen siparisler webhook araciligiyla otomatik olarak sisteme akar.
              </p>
              
              <div>
                <h4 className="font-semibold mb-2">Siparis Akisi</h4>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Musteri web sitesinden rezervasyon yapar ve odeme tamamlar</li>
                  <li>WooCommerce webhook tetiklenir ve siparis sisteme iletilir</li>
                  <li>Sistem, urun adini aktivite/paket tur ile eslestirir</li>
                  <li>Rezervasyon <strong>"Onayli"</strong> durumunda olusturulur</li>
                  <li>Aktivitenin onay mesaji musteriye (WhatsApp veya email ile) gonderilebilir</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Para Birimi Destegi</h4>
                <p className="text-muted-foreground">
                  Sistem TRY ve USD para birimlerini destekler. WooCommerce siparisindeki para birimine gore 
                  fiyat otomatik olarak ilgili alana (priceTl veya priceUsd) kaydedilir.
                </p>
              </div>
            </div>
          </Section>

          <Section 
            icon={<Clock className="h-5 w-5" />}
            title="5. Guncelleme Gecmisi"
            id="guncellemeler"
          >
            <div className="space-y-4">
              <UpdateEntry 
                date="02.01.2026"
                title="Bot Rezervasyon Kurali Eklendi"
                description="Bot asla dogrudan rezervasyon olusturmaz. Musaitlik varsa web sitesi linkini paylasarak yonlendirir. On odeme olmadan rezervasyon alinmaz."
                type="kural"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Tatil/Bayram Algilama"
                description="Bot artik 'bayramda musait misiniz?', 'kurban bayrami' gibi ifadeleri anliyor ve ilgili tarihlerin kapasitesini kontrol ediyor."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Dinamik Tarih Algilama"
                description="Bot 'yarin', '5 subat', 'hafta sonu', '15.01' gibi Turkce tarih ifadelerini anliyor."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Anahtar Kelime Girisi Kolaylastirildi"
                description="Tatil eklerken anahtar kelimeler artik virgul ile ayrilarak girilebilir (JSON formatina gerek yok)."
                type="iyilestirme"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="WooCommerce Siparisleri Otomatik Onayli"
                description="Web sitesinden gelen ve odemesi yapilmis siparisler artik 'Onayli' durumunda kaydediliyor."
                type="ozellik"
              />
              <UpdateEntry 
                date="31.12.2025"
                title="Finans & Acenta Modulu"
                description="Aktivite maliyetleri, KDV hesaplamasi, acenta odemeleri ve hesaplasma takibi eklendi."
                type="ozellik"
              />
              <UpdateEntry 
                date="31.12.2025"
                title="Proje Baslangici"
                description="Temel altyapi kuruldu: Aktivite yonetimi, rezervasyonlar, takvim, WhatsApp bot entegrasyonu."
                type="ozellik"
              />
            </div>
          </Section>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-8 border-t">
          Bu kilavuz sistem guncellemeleriyle birlikte guncellenmektedir.
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
    ozellik: 'Yeni Ozellik',
    kural: 'Kural Degisikligi',
    iyilestirme: 'Iyilestirme',
    duzeltme: 'Duzeltme',
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
