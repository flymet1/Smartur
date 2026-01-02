import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
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
  Languages,
  ExternalLink,
  ChevronRight,
  Package,
  Building2,
  Phone,
  Mail,
  Smartphone,
  CalendarDays,
  ListChecks,
  MessagesSquare,
  Receipt,
  UserCheck,
  AlertCircle,
  Wrench,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  MapPin,
  DollarSign,
  Percent,
  ClipboardList,
  Send,
  Link as LinkIcon,
  Key,
  Palette,
  Database,
  Webhook,
  TestTube,
  Headphones,
  LayoutDashboard,
  Activity,
  TrendingUp,
  PieChart,
  ArrowRight
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

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
            My Smartur Rezervasyon ve Operasyon Yönetim Sistemi - Kapsamlı Kullanım Rehberi
          </p>
        </div>

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Hızlı Erişim
            </h3>
            <div className="flex flex-wrap gap-2">
              <QuickNavButton href="#genel-bakis" label="Genel Bakış" />
              <QuickNavButton href="#panel-sayfalari" label="Panel Sayfaları" />
              <QuickNavButton href="#whatsapp-bot" label="WhatsApp Bot" />
              <QuickNavButton href="#rezervasyon-yonetimi" label="Rezervasyon" />
              <QuickNavButton href="#musteri-takip" label="Müşteri Takip" />
              <QuickNavButton href="#finans" label="Finans" />
              <QuickNavButton href="#ayarlar" label="Ayarlar" />
              <QuickNavButton href="#lisans" label="Lisans" />
              <QuickNavButton href="#sorun-giderme" label="Sorun Giderme" />
              <QuickNavButton href="#guncellemeler" label="Güncellemeler" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Section 
            icon={<Globe className="h-5 w-5" />}
            title="1. Genel Bakış"
            id="genel-bakis"
          >
            <p className="text-muted-foreground mb-6">
              My Smartur, tur operatörleri ve aktivite sağlayıcıları için geliştirilmiş profesyonel bir 
              rezervasyon ve operasyon yönetim sistemidir. Web sitenizden gelen siparişler otomatik olarak 
              sisteme aktarılır, WhatsApp botunuz müşterilerinize 7/24 hizmet verir.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <FeatureCard 
                icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
                title="WooCommerce Entegrasyonu"
                description="Web sitenizdeki siparişler webhook ile anında sisteme aktarılır. TL ve USD çift para birimi desteği."
              />
              <FeatureCard 
                icon={<Bot className="h-5 w-5 text-green-500" />}
                title="Akıllı WhatsApp Asistanı"
                description="Google Gemini AI destekli bot, müşteri sorularını otomatik yanıtlar ve rezervasyona yönlendirir."
              />
              <FeatureCard 
                icon={<Calendar className="h-5 w-5 text-orange-500" />}
                title="Takvim ve Kapasite"
                description="Aktiviteleriniz için günlük kapasite tanımlayın, doluluk oranlarını anlık takip edin."
              />
              <FeatureCard 
                icon={<CreditCard className="h-5 w-5 text-purple-500" />}
                title="Finansal Takip"
                description="Acenta ödemeleri, tedarikçi maliyetleri ve KDV hesaplaması ile tam finansal kontrol."
              />
              <FeatureCard 
                icon={<UserCheck className="h-5 w-5 text-cyan-500" />}
                title="Müşteri Takip Sistemi"
                description="Müşterilerinize özel takip linki gönderin, değişiklik/iptal taleplerini kolayca yönetin."
              />
              <FeatureCard 
                icon={<Building2 className="h-5 w-5 text-rose-500" />}
                title="Acenta Yönetimi"
                description="Acentalarınızı tanımlayın, sevk kayıtları oluşturun ve hesaplaşmalarınızı takip edin."
              />
            </div>
          </Section>

          <Section 
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="2. Panel Sayfaları"
            id="panel-sayfalari"
          >
            <p className="text-muted-foreground mb-6">
              Sistemdeki tüm sayfalar ve işlevleri aşağıda detaylı olarak açıklanmıştır.
            </p>

            <div className="space-y-4">
              <PageGuideCard 
                icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
                title="Genel Bakış (Dashboard)"
                path="/"
                features={[
                  "Günlük rezervasyon özeti ve toplam gelir",
                  "Haftalık satış grafiği (TL/USD)",
                  "Doluluk oranı göstergesi (tarih seçilebilir)",
                  "Aktivite bazlı kapasite detayları",
                  "Bekleyen müşteri talepleri sayısı",
                  "Destek talepleri bildirimi",
                  "Üyelik/lisans durumu kartı"
                ]}
              />

              <PageGuideCard 
                icon={<Calendar className="h-5 w-5 text-orange-500" />}
                title="Takvim"
                path="/calendar"
                features={[
                  "Aktivite bazlı kapasite görüntüleme",
                  "Varsayılan slotlar otomatik gösterilir (kesikli kenarlık)",
                  "Özel kapasite slotları ekleme/düzenleme",
                  "Slot silme ve kapasite ayarlama",
                  "Seçili günün rezervasyonlarına hızlı erişim butonu",
                  "Aktivite filtresi ile sadece istenen aktiviteyi görme"
                ]}
              />

              <PageGuideCard 
                icon={<ClipboardList className="h-5 w-5 text-green-500" />}
                title="Rezervasyonlar"
                path="/reservations"
                features={[
                  "Liste ve takvim görünümü seçenekleri",
                  "Sipariş no, müşteri adı, telefon ile arama",
                  "Durum filtresi (Tümü, Onaylı, Beklemede, İptal)",
                  "Tarih filtresi ile belirli güne odaklanma",
                  "Paket tur rezervasyonları gruplandırılmış gösterim",
                  "Durum değiştirme (tek tıkla onay/iptal)",
                  "WhatsApp ile müşteri bilgilendirme",
                  "Manuel rezervasyon oluşturma"
                ]}
              />

              <PageGuideCard 
                icon={<Activity className="h-5 w-5 text-cyan-500" />}
                title="Aktiviteler"
                path="/activities"
                features={[
                  "Tur ve aktivite tanımlama",
                  "TL ve USD fiyat belirleme",
                  "Süre ve günlük frekans ayarı",
                  "Varsayılan saatler ve kapasite",
                  "Rezervasyon onay mesajı şablonu",
                  "Rezervasyon linki (TR/EN)",
                  "Otel transferi bölgeleri",
                  "Ekstra hizmetler (ör: Kadın Pilot, Akrobasi)",
                  "SSS (Sık Sorulan Sorular) yönetimi",
                  "Acenta/admin bildirim ayarları"
                ]}
              />

              <PageGuideCard 
                icon={<Package className="h-5 w-5 text-purple-500" />}
                title="Paket Turlar"
                path="/package-tours"
                features={[
                  "Birden fazla aktiviteyi içeren paketler",
                  "Paket fiyatı ve açıklama",
                  "Rezervasyon onay mesajı",
                  "Paket bazlı SSS tanımlama",
                  "Aktivite ataması yapma"
                ]}
              />

              <PageGuideCard 
                icon={<Receipt className="h-5 w-5 text-emerald-500" />}
                title="Finans"
                path="/finance"
                features={[
                  "Acenta listesi ve yönetimi",
                  "Sevk kayıtları (dispatch) oluşturma",
                  "Ödeme kayıtları (payout) takibi",
                  "KDV hesaplaması ve fatura bilgisi",
                  "Dönemsel ödeme raporları",
                  "Acenta bazlı hesaplaşma özeti"
                ]}
              />

              <PageGuideCard 
                icon={<Building2 className="h-5 w-5 text-rose-500" />}
                title="Acentalar"
                path="/agencies"
                features={[
                  "Acenta bilgileri (isim, iletişim, notlar)",
                  "Varsayılan kişi başı ödeme tutarı",
                  "Aktif/pasif durumu",
                  "Telefon numarası ile WhatsApp bilgilendirme"
                ]}
              />

              <PageGuideCard 
                icon={<MessagesSquare className="h-5 w-5 text-blue-500" />}
                title="Mesajlar"
                path="/messages"
                features={[
                  "WhatsApp konuşma geçmişi",
                  "Müşteri ve bot mesajları",
                  "Telefon numarasına göre filtreleme",
                  "Mesaj detayları ve zaman damgası"
                ]}
              />

              <PageGuideCard 
                icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                title="Müşteri Talepleri"
                path="/customer-requests"
                features={[
                  "Saat değişikliği, iptal ve diğer talepler",
                  "Talep onaylama/reddetme",
                  "Otomatik WhatsApp bildirim gönderme",
                  "Acentayı bilgilendirme özelliği",
                  "Yeni talep sayısı badge göstergesi",
                  "30 saniyede otomatik yenileme"
                ]}
              />

              <PageGuideCard 
                icon={<Headphones className="h-5 w-5 text-red-500" />}
                title="Destek Talepleri"
                path="/support"
                features={[
                  "Bot tarafından oluşturulan eskalasyonlar",
                  "Müşteri şikayetleri ve özel talepler",
                  "Talep durumu (açık/çözüldü)",
                  "Destek talebi oluşturma formu"
                ]}
              />

              <PageGuideCard 
                icon={<TestTube className="h-5 w-5 text-indigo-500" />}
                title="Bot Test"
                path="/bot-test"
                features={[
                  "WhatsApp botu simülasyonu",
                  "Gerçek AI yanıtlarını test etme",
                  "Farklı senaryoları deneme",
                  "Bot davranışını kontrol etme"
                ]}
              />

              <PageGuideCard 
                icon={<Settings className="h-5 w-5 text-gray-500" />}
                title="Ayarlar"
                path="/settings"
                features={[
                  "4 ana sekme: Güvenlik, WhatsApp, Entegrasyonlar, Sistem",
                  "Panel giriş bilgileri ve şifre değiştirme",
                  "Logo yükleme",
                  "Bot prompt ve erişim ayarları",
                  "Otomatik yanıt kuralları (TR/EN)",
                  "Kara liste yönetimi",
                  "Tatil/bayram tanımları",
                  "Gmail entegrasyonu",
                  "Sürüm ve güncelleme kontrolü",
                  "Hata raporu oluşturma"
                ]}
              />

              <PageGuideCard 
                icon={<Wrench className="h-5 w-5 text-slate-500" />}
                title="Geliştirici Paneli"
                path="/bot-rules"
                features={[
                  "Bot kurallarını görüntüleme ve düzenleme",
                  "Sistem loglarını inceleme",
                  "Geliştirici e-posta ayarı",
                  "Destek taleplerini yönetme",
                  "Teknik yapılandırma"
                ]}
              />
            </div>
          </Section>

          <Section 
            icon={<Bot className="h-5 w-5" />}
            title="3. WhatsApp Bot Sistemi"
            id="whatsapp-bot"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Bot Yetenekleri
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <CapabilityItem 
                    title="Aktivite Bilgisi" 
                    description="Fiyat, süre, detaylar ve ekstralar hakkında bilgi verir"
                  />
                  <CapabilityItem 
                    title="Müsaitlik Kontrolü" 
                    description="7 günlük kapasite verilerini kontrol eder ve bildirir"
                  />
                  <CapabilityItem 
                    title="Tarih Algılama" 
                    description="'Yarın', '5 şubat', 'hafta sonu', 'bayramda' gibi ifadeleri anlar"
                  />
                  <CapabilityItem 
                    title="Rezervasyon Yönlendirme" 
                    description="Müsaitlik varsa web sitesi rezervasyon linkini paylaşır"
                  />
                  <CapabilityItem 
                    title="Çok Dilli Destek" 
                    description="Türkçe ve İngilizce otomatik dil algılama"
                  />
                  <CapabilityItem 
                    title="SSS Yanıtları" 
                    description="Aktivite ve paket turlara tanımlı SSS'leri kullanır"
                  />
                  <CapabilityItem 
                    title="Onay Mesajları" 
                    description="Rezervasyon sonrası dinamik onay mesajı gönderir"
                  />
                  <CapabilityItem 
                    title="Takip Sayfası" 
                    description="Müşteriye takip linki bilgisi verir"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-500" />
                  Eskalasyon (Size Yönlendirme) Durumları
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Şikayet veya memnuniyetsizlik ifadeleri</li>
                  <li>Fiyat indirimi, grup indirimi talepleri</li>
                  <li>"Beni arayın", "operatör" gibi istekler</li>
                  <li>2 mesajda çözülemeyen sorular</li>
                  <li>Özel talepler ve istisnai durumlar</li>
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Önemli: Rezervasyon Politikası
                </h4>
                <p className="text-sm text-muted-foreground">
                  Bot asla doğrudan rezervasyon almaz. Müsaitlik varsa müşteriye web sitenizdeki 
                  rezervasyon linkini paylaşarak ödeme yapmasını sağlar. Tüm rezervasyonlar 
                  güvenli ve ödemeli şekilde alınır.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Otomatik Yanıtlar (Maliyet Tasarrufu)
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Sık sorulan sorular için anahtar kelime bazlı otomatik yanıtlar tanımlayabilirsiniz.
                  Bu yanıtlar AI kullanmadan anında verilir, maliyet tasarrufu sağlar.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Transfer Bilgisi</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "transfer, havalimanı, shuttle"</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Çalışma Saatleri</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "saat, kaçta, açık mı"</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">İptal Politikası</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "iptal, iade, erteleme"</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Ödeme Yöntemleri</p>
                    <p className="text-xs text-muted-foreground">Anahtar: "ödeme, kredi kartı, nakit"</p>
                  </div>
                </div>
                <div className="mt-3">
                  <NavLink href="/settings" label="Otomatik Yanıtları Düzenle" icon={<Settings className="h-4 w-4" />} />
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  Kara Liste
                </h4>
                <p className="text-sm text-muted-foreground">
                  Spam veya istenmeyen numaraları kara listeye ekleyerek bot yanıt vermesini engelleyebilirsiniz.
                </p>
                <div className="mt-3">
                  <NavLink href="/settings" label="Kara Liste Yönetimi" icon={<Settings className="h-4 w-4" />} />
                </div>
              </div>
            </div>
          </Section>

          <Section 
            icon={<ClipboardList className="h-5 w-5" />}
            title="4. Rezervasyon Yönetimi"
            id="rezervasyon-yonetimi"
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Rezervasyon Kaynakları</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                    <Webhook className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="font-medium text-sm">WooCommerce</p>
                    <p className="text-xs text-muted-foreground">Otomatik webhook</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <MessageCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="font-medium text-sm">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Bot yönlendirmesi</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
                    <Edit className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <p className="font-medium text-sm">Manuel</p>
                    <p className="text-xs text-muted-foreground">Panel üzerinden</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Manuel Rezervasyon Oluşturma</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li>Rezervasyonlar sayfasında "Yeni Rezervasyon" butonuna tıklayın</li>
                  <li>Müşteri bilgilerini girin (ad, telefon, e-posta)</li>
                  <li>Aktivite veya paket tur seçin</li>
                  <li>Tarih ve saat belirleyin</li>
                  <li>Kişi sayısını girin</li>
                  <li>İsteğe bağlı: Sipariş numarası ekleyin</li>
                  <li>WhatsApp bildirim seçeneğini işaretleyin (opsiyonel)</li>
                  <li>Kaydet butonuna tıklayın</li>
                </ol>
                <div className="mt-3">
                  <NavLink href="/reservations" label="Rezervasyonlara Git" icon={<ClipboardList className="h-4 w-4" />} />
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Durum Yönetimi</h4>
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Beklemede</Badge>
                  <Badge className="bg-green-100 text-green-700 border-green-200">Onaylı</Badge>
                  <Badge className="bg-red-100 text-red-700 border-red-200">İptal</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Rezervasyon durumunu değiştirmek için durum badge'ine tıklayın ve açılan menüden seçim yapın.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Paket Tur Rezervasyonları</h4>
                <p className="text-sm text-muted-foreground">
                  Paket tur rezervasyonları mor kenarlıkla gruplandırılmış şekilde görüntülenir.
                  Aynı sipariş numarasına sahip aktiviteler tek grup altında toplanır.
                </p>
              </div>
            </div>
          </Section>

          <Section 
            icon={<UserCheck className="h-5 w-5" />}
            title="5. Müşteri Takip Sistemi"
            id="musteri-takip"
          >
            <div className="space-y-6">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-cyan-600">
                  <LinkIcon className="h-4 w-4" />
                  Takip Linki Sistemi
                </h4>
                <p className="text-sm text-muted-foreground">
                  Her rezervasyon için benzersiz bir takip linki oluşturulur. Müşteriler bu link üzerinden:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Rezervasyon durumlarını görüntüleyebilir</li>
                  <li>Saat değişikliği talebinde bulunabilir</li>
                  <li>İptal talebinde bulunabilir</li>
                  <li>Diğer özel talepler iletebilir</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Müşteri Taleplerini Yönetme</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li>Müşteri Talepleri sayfasına gidin</li>
                  <li>Bekleyen talepleri inceleyin</li>
                  <li>Onay veya red işlemi yapın</li>
                  <li>Otomatik WhatsApp bildirimi gönderin</li>
                  <li>Gerekirse acentayı bilgilendirin</li>
                </ol>
                <div className="mt-3">
                  <NavLink href="/customer-requests" label="Müşteri Taleplerine Git" icon={<AlertCircle className="h-4 w-4" />} />
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600">
                  <Send className="h-4 w-4" />
                  WhatsApp Bildirim Gönderme
                </h4>
                <p className="text-sm text-muted-foreground">
                  Talep onay/red sonrası otomatik olarak WhatsApp bildirim dialogu açılır.
                  Dinamik mesaj şablonu kullanarak müşteriye bilgi gönderin.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Token Güvenliği</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                  <li>Her rezervasyon için benzersiz token oluşturulur</li>
                  <li>Aktivite tarihinden 1 gün sonra token otomatik silinir</li>
                  <li>Günlük temizleme job'ı çalışır</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section 
            icon={<Receipt className="h-5 w-5" />}
            title="6. Finans ve Acenta Yönetimi"
            id="finans"
          >
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <Building2 className="h-6 w-6 text-rose-500 mb-2" />
                  <h4 className="font-semibold">Acentalar</h4>
                  <p className="text-sm text-muted-foreground">Tedarikçi ve acenta kayıtları</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <ClipboardList className="h-6 w-6 text-blue-500 mb-2" />
                  <h4 className="font-semibold">Sevk Kayıtları</h4>
                  <p className="text-sm text-muted-foreground">Günlük misafir sevkleri</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <DollarSign className="h-6 w-6 text-green-500 mb-2" />
                  <h4 className="font-semibold">Ödeme Kayıtları</h4>
                  <p className="text-sm text-muted-foreground">Acenta ödemeleri takibi</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Acenta Oluşturma</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Finans veya Acentalar sayfasına gidin</li>
                  <li>"Yeni Acenta" butonuna tıklayın</li>
                  <li>Acenta adı, iletişim bilgisi ve telefon girin</li>
                  <li>Varsayılan kişi başı ödeme tutarını belirleyin</li>
                  <li>Notlar ekleyin (opsiyonel)</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Sevk Kaydı Oluşturma</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Finans sayfasında "Sevk Kayıtları" sekmesine gidin</li>
                  <li>"Yeni Sevk" butonuna tıklayın</li>
                  <li>Acenta ve aktivite seçin</li>
                  <li>Tarih, saat ve misafir sayısı girin</li>
                  <li>Kişi başı tutar otomatik gelir veya düzenleyin</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Ödeme Kaydı ve KDV</h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">KDV Hesaplaması</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ödeme kaydı oluştururken KDV oranı belirleyebilirsiniz.
                    Sistem otomatik olarak KDV tutarını ve toplam tutarı hesaplar.
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <NavLink href="/finance" label="Finans Sayfasına Git" icon={<Receipt className="h-4 w-4" />} />
              </div>
            </div>
          </Section>

          <Section 
            icon={<Settings className="h-5 w-5" />}
            title="7. Ayarlar Detayları"
            id="ayarlar"
          >
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Ayarlar sayfası 4 ana sekmeye ayrılmıştır:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <SettingsTabCard 
                  icon={<Shield className="h-5 w-5 text-blue-500" />}
                  title="Güvenlik"
                  items={[
                    "Panel kullanıcı adı ve şifre",
                    "Şifre değiştirme (onay alanı ile)",
                    "Sidebar logosu yükleme",
                    "Gmail entegrasyonu ayarları"
                  ]}
                />
                
                <SettingsTabCard 
                  icon={<MessageCircle className="h-5 w-5 text-green-500" />}
                  title="WhatsApp"
                  items={[
                    "Bot sistem prompt'u",
                    "Bot erişim izinleri (aktiviteler, SSS, kapasite)",
                    "Otomatik yanıt kuralları (TR/EN)",
                    "Kara liste yönetimi"
                  ]}
                />
                
                <SettingsTabCard 
                  icon={<CalendarDays className="h-5 w-5 text-orange-500" />}
                  title="Entegrasyonlar"
                  items={[
                    "WooCommerce webhook bilgisi",
                    "Tatil ve bayram tanımları",
                    "Döviz kuru ayarları"
                  ]}
                />
                
                <SettingsTabCard 
                  icon={<FileText className="h-5 w-5 text-purple-500" />}
                  title="Sistem"
                  items={[
                    "Sürüm bilgisi ve güncelleme kontrolü",
                    "Hata raporu (debug snapshot) oluşturma",
                    "VPS güncelleme talimatları",
                    "Sistem sağlığı durumu"
                  ]}
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-600">
                  <Download className="h-4 w-4" />
                  Hata Raporu Oluşturma
                </h4>
                <p className="text-sm text-muted-foreground">
                  Sorun yaşadığınızda Ayarlar &gt; Sistem sekmesindeki "Hata Ayıklama" kartından
                  tek tıkla sistem raporu oluşturabilirsiniz. Rapor tüm sistem bilgilerini toplar
                  ve müşteri bilgilerini otomatik gizler.
                </p>
              </div>

              <div className="mt-3">
                <NavLink href="/settings" label="Ayarlara Git" icon={<Settings className="h-4 w-4" />} />
              </div>
            </div>
          </Section>

          <Section 
            icon={<Key className="h-5 w-5" />}
            title="8. Lisans ve Üyelik Sistemi"
            id="lisans"
          >
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Sistem 4 farklı plan tipini destekler:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <Badge variant="outline" className="mb-2">Trial</Badge>
                  <p className="text-sm text-muted-foreground">14 günlük deneme süresi</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <Badge className="bg-blue-500 mb-2">Basic</Badge>
                  <p className="text-sm text-muted-foreground">Temel özellikler</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <Badge className="bg-purple-500 mb-2">Professional</Badge>
                  <p className="text-sm text-muted-foreground">Gelişmiş özellikler</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <Badge className="bg-amber-500 mb-2">Enterprise</Badge>
                  <p className="text-sm text-muted-foreground">Sınırsız kullanım</p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-600">
                  <Clock className="h-4 w-4" />
                  Lisans Süresi Dolduğunda
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>14 gün öncesinden uyarı alırsınız</li>
                  <li>Son 7 gün: Salt okunur mod (veri görüntüleme)</li>
                  <li>Süre dolduğunda: Giriş sadece fatura sayfasına</li>
                  <li>Verileriniz korunur, silinmez</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Sidebar Lisans Göstergesi</h4>
                <p className="text-sm text-muted-foreground">
                  Sidebar'da lisans durumunuz sürekli görüntülenir:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-green-500">14+ gün kaldı</Badge>
                  <Badge className="bg-yellow-500">7-14 gün kaldı</Badge>
                  <Badge className="bg-red-500">7 günden az / Süresi dolmuş</Badge>
                </div>
              </div>
            </div>
          </Section>

          <Section 
            icon={<HelpCircle className="h-5 w-5" />}
            title="9. Sorun Giderme"
            id="sorun-giderme"
          >
            <div className="space-y-4">
              <TroubleshootCard 
                problem="WhatsApp mesajları gelmiyor"
                solution="Twilio bağlantınızı kontrol edin. Ayarlar > WhatsApp sekmesinden webhook URL'inin doğru olduğundan emin olun."
              />
              <TroubleshootCard 
                problem="Sipariş otomatik gelmiyor"
                solution="WooCommerce webhook ayarlarınızı kontrol edin. Webhook URL'ini doğru girdiğinizden ve 'Sipariş tamamlandı' olayını seçtiğinizden emin olun."
              />
              <TroubleshootCard 
                problem="Bot yanlış bilgi veriyor"
                solution="Aktivite bilgilerini güncelleyin. SSS bölümlerine doğru bilgileri ekleyin. Bot prompt'unu kontrol edin."
              />
              <TroubleshootCard 
                problem="Kapasite yanlış görünüyor"
                solution="Takvim sayfasından varsayılan kapasite ve özel slotları kontrol edin. Aktivite ayarlarındaki defaultCapacity değerini gözden geçirin."
              />
              <TroubleshootCard 
                problem="WhatsApp bildirimi gönderilmiyor"
                solution="Twilio API anahtarlarınızı kontrol edin. Telefon numarası formatının doğru olduğundan emin olun (+90 ile başlamalı)."
              />
            </div>
          </Section>

          <Section 
            icon={<RefreshCw className="h-5 w-5" />}
            title="10. Son Güncellemeler"
            id="guncellemeler"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                En son eklenen özellikler ve iyileştirmeler:
              </p>
              
              <UpdateEntry 
                date="02.01.2026"
                title="Lisans ve Üyelik Sistemi"
                description="4 plan tipi, aktivite/rezervasyon limitleri, süre dolduğunda salt okunur mod ve otomatik yenileme."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Müşteri Takip Sistemi"
                description="Benzersiz takip linki, saat değişikliği/iptal talepleri, WhatsApp ve acenta bildirimi."
                type="ozellik"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Gelişmiş WhatsApp Bot"
                description="İki dilli otomatik yanıtlar (TR/EN), retry mekanizması, akıllı fallback ve takip sayfası entegrasyonu."
                type="iyilestirme"
              />
              <UpdateEntry 
                date="02.01.2026"
                title="Takvim ve Kapasite İyileştirmeleri"
                description="Varsayılan slotlar otomatik gösterim, aktivite filtresi, gün özeti, dinamik doluluk oranı."
                type="iyilestirme"
              />
              <UpdateEntry 
                date="31.12.2025"
                title="Finans ve Acenta Modülü"
                description="Tedarikçi maliyetleri, acenta ödemeleri, KDV hesaplaması ve hesaplaşma takibi."
                type="ozellik"
              />

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Tüm değişiklik geçmişi için Ayarlar &gt; Sistem sekmesindeki "Güncellemeler" kartını inceleyebilirsiniz.
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-8 border-t space-y-2">
          <p>My Smartur Rezervasyon ve Operasyon Yönetim Sistemi</p>
          <p>Sorularınız için destek ekibimizle iletişime geçebilirsiniz.</p>
          <NavLink href="/support" label="Destek Talebi Oluştur" icon={<Headphones className="h-4 w-4" />} />
        </div>
      </main>
    </div>
  );
}

function QuickNavButton({ href, label }: { href: string; label: string }) {
  return (
    <a 
      href={href}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-background border text-sm hover:bg-muted transition-colors"
    >
      {label}
      <ChevronRight className="h-3 w-3" />
    </a>
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

function PageGuideCard({ icon, title, path, features }: { icon: React.ReactNode; title: string; path: string; features: string[] }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold">{title}</h4>
        </div>
        <Link href={path}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ExternalLink className="h-3 w-3" />
            Git
          </Button>
        </Link>
      </div>
      <ul className="text-sm text-muted-foreground space-y-1">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <ChevronRight className="h-3 w-3 mt-1.5 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CapabilityItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-2 bg-muted/30 rounded-lg p-3">
      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SettingsTabCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-semibold">{title}</h4>
      </div>
      <ul className="text-sm text-muted-foreground space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TroubleshootCard({ problem, solution }: { problem: string; solution: string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="font-medium text-sm">{problem}</p>
      </div>
      <p className="text-sm text-muted-foreground ml-6">{solution}</p>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href}>
      <Button variant="outline" size="sm" className="gap-2">
        {icon}
        {label}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </Link>
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
