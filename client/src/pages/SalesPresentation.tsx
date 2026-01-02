import { Button } from "@/components/ui/button";
import { 
  Printer,
  Bot,
  Calendar,
  ShoppingCart,
  Users,
  CreditCard,
  MessageCircle,
  CheckCircle,
  Globe,
  Smartphone,
  BarChart3,
  Shield,
  Zap,
  Clock,
  TrendingUp,
  Package,
  Building2,
  Receipt,
  Settings,
  UserCheck,
  Languages,
  Bell,
  FileText,
  Webhook,
  Star,
  Target,
  Award,
  Headphones,
  ArrowRight,
  Check,
  Plane,
  Scissors,
  Sparkles,
  Hotel
} from "lucide-react";

export default function SalesPresentation() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} className="gap-2 shadow-lg" data-testid="button-print-pdf">
          <Printer className="h-4 w-4" />
          PDF Olarak Kaydet
        </Button>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          .page-break {
            page-break-before: always;
          }
          .no-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <CoverPage />
      <ExecutiveSummary />
      <PainPoints />
      <ValueProposition />
      <DashboardFeatures />
      <ReservationFeatures />
      <CalendarFeatures />
      <WhatsAppBotFeatures />
      <CustomerTrackingFeatures />
      <FinanceFeatures />
      <IntegrationFeatures />
      <IndustryUseCases />
      <PricingPlans />
      <CallToAction />
    </div>
  );
}

function CoverPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-12">
      <div className="text-center max-w-4xl">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-2xl mb-6">
            <Bot className="w-14 h-14" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold mb-4">My Smartur</h1>
        <p className="text-2xl font-light mb-8 text-blue-100">
          Akıllı Rezervasyon ve Operasyon Yönetim Sistemi
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <FeaturePill icon={<Bot className="w-4 h-4" />} text="WhatsApp Bot" />
          <FeaturePill icon={<Calendar className="w-4 h-4" />} text="Kapasite Yönetimi" />
          <FeaturePill icon={<ShoppingCart className="w-4 h-4" />} text="WooCommerce" />
          <FeaturePill icon={<CreditCard className="w-4 h-4" />} text="Finans Takibi" />
        </div>

        <p className="text-xl text-blue-100 max-w-2xl mx-auto">
          Turlar, Kuaförler, Salonlar ve Oteller için
          <br />
          <span className="font-semibold text-white">Tek Platform, Sınırsız Olanak</span>
        </p>
      </div>

      <div className="absolute bottom-8 text-sm text-blue-200">
        www.smartur.com
      </div>
    </div>
  );
}

function FeaturePill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm">
      {icon}
      {text}
    </div>
  );
}

function ExecutiveSummary() {
  return (
    <div className="page-break min-h-screen p-12 flex flex-col justify-center">
      <SectionHeader 
        icon={<FileText className="w-8 h-8" />}
        title="Yönetici Özeti"
        subtitle="My Smartur Nedir?"
      />

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="space-y-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            <strong>My Smartur</strong>, tur operatörleri, kuaförler, güzellik salonları ve 
            oteller için geliştirilmiş kapsamlı bir rezervasyon ve operasyon yönetim sistemidir.
          </p>
          
          <p className="text-gray-600">
            Yapay zeka destekli WhatsApp asistanı ile müşterilerinize 7/24 hizmet verin, 
            web sitenizden gelen siparişleri otomatik olarak yönetin ve finansal durumunuzu 
            anlık olarak takip edin.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-800 mb-3">Temel Faydalar</h4>
            <ul className="space-y-2">
              <BenefitItem text="Müşteri hizmetlerinde %70'e varan zaman tasarrufu" />
              <BenefitItem text="7/24 kesintisiz otomatik müşteri yanıtları" />
              <BenefitItem text="Sıfır kayıp rezervasyon ve çift rezervasyon" />
              <BenefitItem text="Anlık finansal görünürlük ve raporlama" />
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <StatCard 
            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
            value="%70"
            label="Zaman Tasarrufu"
            description="Manuel işlemlerde azalma"
          />
          <StatCard 
            icon={<Clock className="w-6 h-6 text-blue-600" />}
            value="7/24"
            label="Kesintisiz Hizmet"
            description="WhatsApp bot ile otomatik yanıt"
          />
          <StatCard 
            icon={<Shield className="w-6 h-6 text-purple-600" />}
            value="%100"
            label="Veri Güvenliği"
            description="Şifreli depolama ve yedekleme"
          />
          <StatCard 
            icon={<Globe className="w-6 h-6 text-orange-600" />}
            value="TR/EN"
            label="Çok Dilli Destek"
            description="Türkçe ve İngilizce yanıtlar"
          />
        </div>
      </div>
    </div>
  );
}

function PainPoints() {
  return (
    <div className="page-break min-h-screen p-12 bg-gray-50">
      <SectionHeader 
        icon={<Target className="w-8 h-8" />}
        title="Karşılaşılan Zorluklar"
        subtitle="Bu Sorunları Tanıyor musunuz?"
      />

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <PainPointCard 
          title="Manuel Rezervasyon Takibi"
          description="Excel veya kağıt üzerinde rezervasyon takibi, çift rezervasyon riski ve kayıp müşteriler."
          solution="Otomatik kapasite yönetimi ve anlık doluluk kontrolü"
        />
        <PainPointCard 
          title="WhatsApp Mesajlarına Yetişememe"
          description="Gelen mesajlara geç yanıt, müşteri memnuniyetsizliği ve kaçan satış fırsatları."
          solution="AI destekli 7/24 otomatik yanıt sistemi"
        />
        <PainPointCard 
          title="Finansal Takip Zorluğu"
          description="Acenta ödemeleri, tedarikçi maliyetleri ve kâr marjının belirsizliği."
          solution="Entegre finans modülü ve otomatik hesaplama"
        />
        <PainPointCard 
          title="Web Sitesi Entegrasyon Eksikliği"
          description="Online siparişlerin manuel olarak sisteme girilmesi, hata ve gecikme riski."
          solution="WooCommerce webhook ile otomatik sipariş aktarımı"
        />
        <PainPointCard 
          title="Müşteri Takibi"
          description="Müşterilerin rezervasyon durumunu sorması, sürekli telefon trafiği."
          solution="Müşteri takip portalı ve otomatik bilgilendirme"
        />
        <PainPointCard 
          title="Çoklu Dil Desteği"
          description="Yabancı turistlere hizmet vermede iletişim güçlüğü."
          solution="Otomatik dil algılama ve çift dilli yanıtlar"
        />
      </div>
    </div>
  );
}

function ValueProposition() {
  return (
    <div className="page-break min-h-screen p-12">
      <SectionHeader 
        icon={<Star className="w-8 h-8" />}
        title="Değer Önerimiz"
        subtitle="Neden My Smartur?"
      />

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <ValueCard 
          icon={<Zap className="w-10 h-10 text-yellow-500" />}
          title="Otomasyon"
          features={[
            "Otomatik rezervasyon onayı",
            "AI destekli müşteri yanıtları",
            "WooCommerce sipariş senkronizasyonu",
            "Otomatik kapasite güncelleme"
          ]}
        />
        <ValueCard 
          icon={<BarChart3 className="w-10 h-10 text-blue-500" />}
          title="Görünürlük"
          features={[
            "Gerçek zamanlı dashboard",
            "Doluluk oranı takibi",
            "Finansal raporlama",
            "Aktivite bazlı analiz"
          ]}
        />
        <ValueCard 
          icon={<Shield className="w-10 h-10 text-green-500" />}
          title="Kontrol"
          features={[
            "Merkezi yönetim paneli",
            "Rol bazlı erişim",
            "Veri yedekleme",
            "Lisans yönetimi"
          ]}
        />
      </div>

      <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <h3 className="text-2xl font-bold mb-4 text-center">Tek Platform, Tüm İhtiyaçlar</h3>
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold">12+</div>
            <div className="text-blue-200">Entegre Modül</div>
          </div>
          <div>
            <div className="text-3xl font-bold">2</div>
            <div className="text-blue-200">Dil Desteği</div>
          </div>
          <div>
            <div className="text-3xl font-bold">4</div>
            <div className="text-blue-200">Lisans Planı</div>
          </div>
          <div>
            <div className="text-3xl font-bold">7/24</div>
            <div className="text-blue-200">Bot Hizmeti</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardFeatures() {
  return (
    <div className="page-break min-h-screen p-12 bg-gray-50">
      <SectionHeader 
        icon={<BarChart3 className="w-8 h-8" />}
        title="Genel Bakış Paneli"
        subtitle="Tüm Operasyonunuz Tek Ekranda"
      />

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="space-y-4">
          <FeatureDetail 
            title="Günlük Özet Kartları"
            description="Bugünkü rezervasyon sayısı, toplam gelir (TL/USD), bekleyen talepler ve doluluk oranı tek bakışta."
          />
          <FeatureDetail 
            title="Haftalık Satış Grafiği"
            description="Son 7 günün satış performansını görsel olarak takip edin, trendleri analiz edin."
          />
          <FeatureDetail 
            title="Dinamik Doluluk Oranı"
            description="Seçtiğiniz tarihe göre anlık doluluk hesaplaması, aktivite bazlı kapasite detayları."
          />
          <FeatureDetail 
            title="Hızlı Erişim Butonları"
            description="Müşteri talepleri ve destek bildirimlerine tek tıkla ulaşın."
          />
          <FeatureDetail 
            title="Lisans Durumu"
            description="Üyelik planınız, kalan gün sayısı ve yenileme bildirimleri."
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="text-sm text-gray-500 mb-4">Dashboard Önizleme</div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">24</div>
                <div className="text-xs text-gray-500">Rezervasyon</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">12.500</div>
                <div className="text-xs text-gray-500">Gelir (TL)</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">%78</div>
                <div className="text-xs text-gray-500">Doluluk</div>
              </div>
            </div>
            <div className="h-32 bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg flex items-end p-4">
              <div className="flex gap-2 items-end w-full">
                <div className="flex-1 bg-blue-400 rounded-t" style={{height: '40%'}}></div>
                <div className="flex-1 bg-blue-400 rounded-t" style={{height: '60%'}}></div>
                <div className="flex-1 bg-blue-400 rounded-t" style={{height: '45%'}}></div>
                <div className="flex-1 bg-blue-400 rounded-t" style={{height: '80%'}}></div>
                <div className="flex-1 bg-blue-400 rounded-t" style={{height: '55%'}}></div>
                <div className="flex-1 bg-blue-400 rounded-t" style={{height: '70%'}}></div>
                <div className="flex-1 bg-blue-600 rounded-t" style={{height: '90%'}}></div>
              </div>
            </div>
            <div className="text-xs text-gray-400 text-center">Haftalık Satış Grafiği</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReservationFeatures() {
  return (
    <div className="page-break min-h-screen p-12">
      <SectionHeader 
        icon={<Calendar className="w-8 h-8" />}
        title="Rezervasyon Yönetimi"
        subtitle="Tüm Rezervasyonlarınız Kontrol Altında"
      />

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="space-y-4">
          <FeatureDetail 
            title="Liste ve Takvim Görünümü"
            description="Rezervasyonlarınızı liste veya takvim formatında görüntüleyin, tercih ettiğiniz şekilde çalışın."
          />
          <FeatureDetail 
            title="Gelişmiş Arama ve Filtreleme"
            description="Sipariş numarası, müşteri adı, telefon veya tarih ile hızlı arama. Durum filtresi ile bekleyen, onaylı veya iptal rezervasyonları ayırın."
          />
          <FeatureDetail 
            title="Tek Tıkla Durum Değiştirme"
            description="Rezervasyon durumunu (Beklemede, Onaylı, İptal) tek tıkla değiştirin."
          />
          <FeatureDetail 
            title="Paket Tur Gruplandırma"
            description="Aynı siparişe ait birden fazla aktivite otomatik gruplandırılır, toplu yönetim kolaylaşır."
          />
          <FeatureDetail 
            title="WhatsApp Bildirim"
            description="Rezervasyon oluştururken veya onaylarken müşteriye otomatik WhatsApp mesajı gönderin."
          />
          <FeatureDetail 
            title="Manuel Rezervasyon Oluşturma"
            description="Telefon veya yüz yüze gelen rezervasyonları kolayca sisteme girin."
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-lg p-6 border">
            <div className="text-sm text-gray-500 mb-4">Rezervasyon Kaynakları</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Webhook className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-sm font-medium">WooCommerce</div>
                <div className="text-xs text-gray-500">Otomatik</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-sm font-medium">WhatsApp</div>
                <div className="text-xs text-gray-500">Bot Yönlendirme</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-sm font-medium">Manuel</div>
                <div className="text-xs text-gray-500">Panel Girişi</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border">
            <div className="text-sm text-gray-500 mb-4">Durum Yönetimi</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="font-medium">Beklemede</span>
                <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm">Onay Bekliyor</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Onaylı</span>
                <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">Aktif</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="font-medium">İptal</span>
                <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">İptal Edildi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarFeatures() {
  return (
    <div className="page-break min-h-screen p-12 bg-gray-50">
      <SectionHeader 
        icon={<Calendar className="w-8 h-8" />}
        title="Takvim ve Kapasite Yönetimi"
        subtitle="Doluluk Oranınızı Optimize Edin"
      />

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="space-y-4">
          <FeatureDetail 
            title="Aktivite Bazlı Kapasite"
            description="Her aktivite için ayrı kapasite tanımlayın. Varsayılan saatler ve kontenjanlar otomatik oluşturulur."
          />
          <FeatureDetail 
            title="Varsayılan Slot Gösterimi"
            description="Aktivitelerde tanımlı varsayılan saatler takvimde otomatik görüntülenir, manuel ekleme gerektirmez."
          />
          <FeatureDetail 
            title="Özel Kapasite Ayarları"
            description="Belirli günler için özel kapasite artırma veya azaltma. Yoğun dönemlerde ekstra kontenjan açın."
          />
          <FeatureDetail 
            title="Aktivite Filtresi"
            description="Sadece görmek istediğiniz aktivitenin kapasitesini filtreleyin."
          />
          <FeatureDetail 
            title="Gün Özeti"
            description="Seçili günün toplam kapasitesi, dolu slot sayısı ve kalan kontenjan bilgisi."
          />
          <FeatureDetail 
            title="Rezervasyonlara Hızlı Erişim"
            description="Takvimden tek tıkla o günün rezervasyon listesine gidin."
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="text-sm text-gray-500 mb-4">Takvim Önizleme</div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
              <div key={day} className="font-medium text-gray-500">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length: 35}, (_, i) => {
              const day = i - 2;
              if (day < 1 || day > 31) return <div key={i} className="h-10"></div>;
              const hasEvents = [3, 7, 12, 15, 18, 22, 25, 28].includes(day);
              const isToday = day === 15;
              return (
                <div 
                  key={i} 
                  className={`h-10 rounded flex flex-col items-center justify-center text-sm
                    ${isToday ? 'bg-blue-600 text-white' : hasEvents ? 'bg-green-100' : 'bg-gray-50'}
                  `}
                >
                  {day}
                  {hasEvents && !isToday && <div className="w-1 h-1 bg-green-500 rounded-full mt-0.5"></div>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 rounded"></div>
              <span>Rezervasyon Var</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span>Bugün</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppBotFeatures() {
  return (
    <div className="page-break min-h-screen p-12">
      <SectionHeader 
        icon={<Bot className="w-8 h-8" />}
        title="WhatsApp AI Asistanı"
        subtitle="7/24 Akıllı Müşteri Hizmeti"
      />

      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-green-800 text-lg">Google Gemini AI Destekli</h3>
            <p className="text-green-700">
              En gelişmiş yapay zeka teknolojisi ile müşterilerinize doğal, akıcı ve profesyonel yanıtlar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="font-semibold text-lg mb-4">Bot Yetenekleri</h4>
          <BotCapability 
            title="Aktivite Bilgisi"
            description="Fiyat, süre, detaylar ve ekstra hizmetler hakkında bilgi verir."
          />
          <BotCapability 
            title="Müsaitlik Kontrolü"
            description="7 günlük kapasite verilerini kontrol eder ve anlık bildirir."
          />
          <BotCapability 
            title="Akıllı Tarih Algılama"
            description="'Yarın', '5 şubat', 'hafta sonu', 'bayramda' gibi ifadeleri anlar."
          />
          <BotCapability 
            title="Rezervasyon Yönlendirme"
            description="Müsaitlik varsa web sitesi linkini paylaşır, ödemeye yönlendirir."
          />
          <BotCapability 
            title="Çok Dilli Destek"
            description="Türkçe ve İngilizce otomatik dil algılama ve yanıt."
          />
          <BotCapability 
            title="SSS Yanıtları"
            description="Aktivitelere tanımlı sık sorulan soruları otomatik yanıtlar."
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-lg mb-4">Ek Özellikler</h4>
          <BotCapability 
            title="Otomatik Yanıtlar"
            description="Sık sorulan sorular için AI kullanmadan hızlı yanıt, maliyet tasarrufu."
          />
          <BotCapability 
            title="Eskalasyon Sistemi"
            description="Karmaşık konularda size bildirim gönderir, müşteriyi yönlendirir."
          />
          <BotCapability 
            title="Onay Mesajları"
            description="Rezervasyon sonrası özelleştirilmiş onay mesajı gönderir."
          />
          <BotCapability 
            title="Takip Sayfası Yönlendirme"
            description="Müşteriye takip linki bilgisi verir."
          />
          <BotCapability 
            title="Retry Mekanizması"
            description="AI erişilemezse otomatik yeniden deneme ve akıllı fallback."
          />
          <BotCapability 
            title="Kara Liste"
            description="Spam numaraları engelleyin, bot yanıt vermesin."
          />
        </div>
      </div>
    </div>
  );
}

function CustomerTrackingFeatures() {
  return (
    <div className="page-break min-h-screen p-12 bg-gray-50">
      <SectionHeader 
        icon={<UserCheck className="w-8 h-8" />}
        title="Müşteri Takip Sistemi"
        subtitle="Müşterilerinize Şeffaflık Sunun"
      />

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="space-y-4">
          <FeatureDetail 
            title="Benzersiz Takip Linki"
            description="Her rezervasyon için özel takip linki oluşturulur. Müşteriler durumlarını 7/24 görüntüleyebilir."
          />
          <FeatureDetail 
            title="Saat Değişikliği Talebi"
            description="Müşteriler takip sayfasından saat değişikliği talebinde bulunabilir."
          />
          <FeatureDetail 
            title="İptal Talebi"
            description="Kolay iptal talep formu ile müşteri memnuniyetini artırın."
          />
          <FeatureDetail 
            title="Talep Yönetimi Paneli"
            description="Gelen talepleri tek yerden görün, onaylayın veya reddedin."
          />
          <FeatureDetail 
            title="Otomatik WhatsApp Bildirimi"
            description="Talep onay/red sonrası müşteriye otomatik bilgilendirme."
          />
          <FeatureDetail 
            title="Acenta Bilgilendirme"
            description="Gerektiğinde acentayı tek tıkla WhatsApp ile bilgilendirin."
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="text-sm text-gray-500 mb-4">Müşteri Takip Portalı</div>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-blue-600 text-white p-4 text-center">
              <h4 className="font-bold">Rezervasyon Takip</h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Durum</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Onaylı</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Aktivite</span>
                <span className="font-medium">Yamaç Paraşütü</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tarih</span>
                <span className="font-medium">15 Ocak 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Saat</span>
                <span className="font-medium">11:00</span>
              </div>
              <div className="border-t pt-4 space-y-2">
                <button className="w-full py-2 bg-blue-50 text-blue-600 rounded font-medium text-sm" data-testid="button-demo-change-time">
                  Saat Değişikliği Talep Et
                </button>
                <button className="w-full py-2 bg-red-50 text-red-600 rounded font-medium text-sm" data-testid="button-demo-cancel">
                  İptal Talep Et
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceFeatures() {
  return (
    <div className="page-break min-h-screen p-12">
      <SectionHeader 
        icon={<Receipt className="w-8 h-8" />}
        title="Finans ve Acenta Yönetimi"
        subtitle="Finansal Kontrolünüz Tam Olsun"
      />

      <div className="grid md:grid-cols-3 gap-6 mt-8 mb-8">
        <div className="bg-blue-50 rounded-xl p-6 text-center">
          <Building2 className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h4 className="font-semibold">Acenta Yönetimi</h4>
          <p className="text-sm text-gray-600 mt-2">Tedarikçi ve acenta kayıtları, iletişim bilgileri</p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 text-center">
          <FileText className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <h4 className="font-semibold">Sevk Kayıtları</h4>
          <p className="text-sm text-gray-600 mt-2">Günlük misafir sevkleri, kişi başı tutar hesabı</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-6 text-center">
          <CreditCard className="w-10 h-10 text-purple-600 mx-auto mb-3" />
          <h4 className="font-semibold">Ödeme Takibi</h4>
          <p className="text-sm text-gray-600 mt-2">Acenta ödemeleri, KDV hesaplaması, dönemsel raporlar</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <FeatureDetail 
            title="Acenta Kaydı"
            description="Acenta adı, iletişim bilgisi, telefon ve varsayılan kişi başı ödeme tutarı."
          />
          <FeatureDetail 
            title="Sevk Kaydı Oluşturma"
            description="Hangi acentadan, hangi aktiviteye, kaç kişi geldi? Otomatik tutar hesaplama."
          />
          <FeatureDetail 
            title="KDV Hesaplaması"
            description="Ödeme kaydında KDV oranı belirleyin, sistem otomatik hesaplasın."
          />
          <FeatureDetail 
            title="Ödeme Durumu Takibi"
            description="Bekleyen, ödenen ve gecikmeli ödemeleri takip edin."
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="text-sm text-gray-500 mb-4">Hesaplaşma Özeti</div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>Red Cloud Acenta</span>
              <span className="font-bold text-green-600">15.000 TL</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>Bubbles Dalış</span>
              <span className="font-bold text-green-600">8.500 TL</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>Up Transfer</span>
              <span className="font-bold text-orange-600">3.200 TL</span>
            </div>
            <div className="border-t pt-4 flex justify-between">
              <span className="font-semibold">Toplam Ödeme</span>
              <span className="font-bold text-blue-600">26.700 TL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationFeatures() {
  return (
    <div className="page-break min-h-screen p-12 bg-gray-50">
      <SectionHeader 
        icon={<Webhook className="w-8 h-8" />}
        title="Entegrasyonlar"
        subtitle="Mevcut Sistemlerinizle Uyum"
      />

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <IntegrationCard 
          icon={<ShoppingCart className="w-12 h-12 text-purple-600" />}
          title="WooCommerce"
          description="WordPress e-ticaret sitenizden gelen siparişler webhook ile otomatik aktarılır."
          features={[
            "Otomatik sipariş aktarımı",
            "Çift para birimi (TL/USD)",
            "Sipariş numarası eşleştirme",
            "Otel ve transfer bilgisi çekme"
          ]}
        />
        <IntegrationCard 
          icon={<MessageCircle className="w-12 h-12 text-green-600" />}
          title="Twilio WhatsApp"
          description="WhatsApp Business API ile profesyonel müşteri iletişimi."
          features={[
            "Gelen mesaj webhook",
            "Otomatik yanıt gönderme",
            "Bildirim mesajları",
            "Mesaj geçmişi kayıt"
          ]}
        />
        <IntegrationCard 
          icon={<Bot className="w-12 h-12 text-blue-600" />}
          title="Google Gemini AI"
          description="En gelişmiş yapay zeka ile akıllı müşteri yanıtları."
          features={[
            "Doğal dil işleme",
            "Bağlam anlama",
            "Çok dilli destek",
            "Sürekli öğrenme"
          ]}
        />
        <IntegrationCard 
          icon={<Globe className="w-12 h-12 text-orange-600" />}
          title="Çoklu Dil"
          description="Türkçe ve İngilizce tam destek, otomatik dil algılama."
          features={[
            "Türkçe arayüz",
            "İngilizce bot yanıtları",
            "Çift dilli SSS",
            "Otomatik dil tespiti"
          ]}
        />
      </div>
    </div>
  );
}

function IndustryUseCases() {
  return (
    <div className="page-break min-h-screen p-12">
      <SectionHeader 
        icon={<Target className="w-8 h-8" />}
        title="Sektörel Çözümler"
        subtitle="Her İşletme İçin Özelleştirilmiş"
      />

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <IndustryCard 
          title="Tur Operatörleri"
          icon={<Plane className="w-10 h-10 text-blue-500" />}
          useCases={[
            "Yamaç paraşütü, dalış, safari turları",
            "Günlük kapasite ve müsaitlik yönetimi",
            "Otel transferi koordinasyonu",
            "Paket tur rezervasyonları",
            "Acenta hesaplaşmaları"
          ]}
        />
        <IndustryCard 
          title="Kuaför ve Berberler"
          icon={<Scissors className="w-10 h-10 text-purple-500" />}
          useCases={[
            "Randevu yönetimi",
            "Personel bazlı kapasite",
            "WhatsApp ile randevu hatırlatma",
            "Müşteri geçmişi takibi",
            "Online randevu alma"
          ]}
        />
        <IndustryCard 
          title="Güzellik Salonları"
          icon={<Sparkles className="w-10 h-10 text-pink-500" />}
          useCases={[
            "Çoklu hizmet rezervasyonu",
            "Uzman/personel ataması",
            "Paket hizmet satışı",
            "Müşteri tercihleri kayıt",
            "Sadakat programı entegrasyonu"
          ]}
        />
        <IndustryCard 
          title="Butik Oteller"
          icon={<Hotel className="w-10 h-10 text-orange-500" />}
          useCases={[
            "Oda rezervasyonu yönetimi",
            "Ekstra hizmet satışı",
            "Check-in/out koordinasyonu",
            "Misafir iletişimi",
            "Doluluk optimizasyonu"
          ]}
        />
      </div>
    </div>
  );
}

function PricingPlans() {
  return (
    <div className="page-break min-h-screen p-12 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-2">Fiyatlandırma</h2>
        <p className="text-gray-400">İşletmenize Uygun Planı Seçin</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <PricingCard 
          name="Trial"
          price="Ücretsiz"
          period="14 Gün"
          features={[
            "Tüm özelliklere erişim",
            "5 aktivite limiti",
            "50 aylık rezervasyon",
            "WhatsApp bot",
            "E-posta desteği"
          ]}
          isPopular={false}
        />
        <PricingCard 
          name="Basic"
          price="₺999"
          period="/ay"
          features={[
            "10 aktivite",
            "200 aylık rezervasyon",
            "WhatsApp bot",
            "WooCommerce entegrasyonu",
            "Temel raporlama",
            "E-posta desteği"
          ]}
          isPopular={false}
        />
        <PricingCard 
          name="Professional"
          price="₺1.999"
          period="/ay"
          features={[
            "25 aktivite",
            "500 aylık rezervasyon",
            "Gelişmiş WhatsApp bot",
            "Tam entegrasyonlar",
            "Finans modülü",
            "Öncelikli destek",
            "Özel eğitim"
          ]}
          isPopular={true}
        />
        <PricingCard 
          name="Enterprise"
          price="Özel"
          period="Teklif"
          features={[
            "Sınırsız aktivite",
            "Sınırsız rezervasyon",
            "Özel geliştirmeler",
            "Beyaz etiket seçeneği",
            "SLA garantisi",
            "Özel hesap yöneticisi",
            "7/24 destek"
          ]}
          isPopular={false}
        />
      </div>

      <div className="text-center mt-12 text-gray-400 text-sm">
        Tüm fiyatlara KDV dahildir. Yıllık ödemelerde %20 indirim.
      </div>
    </div>
  );
}

function CallToAction() {
  return (
    <div className="page-break min-h-screen p-12 flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
      <div className="text-center max-w-3xl">
        <Award className="w-20 h-20 mx-auto mb-8 text-yellow-400" />
        
        <h2 className="text-4xl font-bold mb-6">
          İşletmenizi Dijitalleştirmeye Hazır mısınız?
        </h2>
        
        <p className="text-xl text-blue-100 mb-12">
          14 günlük ücretsiz deneme ile My Smartur'u risksiz deneyin.
          Kredi kartı gerekmez.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400">1</div>
            <div className="text-lg font-medium mt-2">Kayıt Olun</div>
            <div className="text-sm text-blue-200">5 dakikada başlayın</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400">2</div>
            <div className="text-lg font-medium mt-2">Kurulum</div>
            <div className="text-sm text-blue-200">Aktivitelerinizi ekleyin</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400">3</div>
            <div className="text-lg font-medium mt-2">Başlayın</div>
            <div className="text-sm text-blue-200">Rezervasyon almaya başlayın</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-2xl font-semibold">İletişim</div>
          <div className="flex flex-wrap justify-center gap-6 text-lg">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              www.smartur.com
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              +90 532 XXX XX XX
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              destek@smartur.com
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 text-sm text-blue-200">
        My Smartur - Akıllı Rezervasyon ve Operasyon Yönetim Sistemi
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-4 mb-2">
      <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function StatCard({ icon, value, label, description }: { icon: React.ReactNode; value: string; label: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </div>
  );
}

function PainPointCard({ title, description, solution }: { title: string; description: string; solution: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <h4 className="font-semibold text-red-600 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <div className="flex items-start gap-2 text-green-700 bg-green-50 rounded-lg p-3">
        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span className="text-sm font-medium">{solution}</span>
      </div>
    </div>
  );
}

function ValueCard({ icon, title, features }: { icon: React.ReactNode; title: string; features: string[] }) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <div className="mb-4">{icon}</div>
      <h4 className="font-bold text-lg mb-4">{title}</h4>
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureDetail({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function BotCapability({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function IntegrationCard({ icon, title, description, features }: { icon: React.ReactNode; title: string; description: string; features: string[] }) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <div>
          <h4 className="font-bold text-lg">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IndustryCard({ title, icon, useCases }: { title: string; icon: React.ReactNode; useCases: string[] }) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <div className="mb-4">{icon}</div>
      <h4 className="font-bold text-lg mb-4">{title}</h4>
      <ul className="space-y-2">
        {useCases.map((useCase, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
            <ArrowRight className="w-3 h-3 text-blue-500" />
            {useCase}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingCard({ name, price, period, features, isPopular }: { name: string; price: string; period: string; features: string[]; isPopular: boolean }) {
  return (
    <div className={`rounded-xl p-6 ${isPopular ? 'bg-blue-600 ring-4 ring-yellow-400' : 'bg-gray-800'}`}>
      {isPopular && (
        <div className="text-center mb-4">
          <span className="px-3 py-1 bg-yellow-400 text-gray-900 rounded-full text-xs font-bold">
            EN POPÜLER
          </span>
        </div>
      )}
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold">{name}</h4>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-gray-400">{period}</span>
        </div>
      </div>
      <ul className="space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm">
            <Check className={`w-4 h-4 ${isPopular ? 'text-yellow-400' : 'text-green-400'}`} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
