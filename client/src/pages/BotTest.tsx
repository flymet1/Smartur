import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Trash2, MessageSquare } from "lucide-react";

const TEST_SCENARIOS = [
  { category: "Fiyat Soruları", tests: [
    { label: "Aktivite fiyatı", message: "Yamaç paraşütü ne kadar?" },
    { label: "Çoklu kişi", message: "2 kişi için yamaç paraşütü ne kadar?" },
    { label: "Ön ödeme", message: "Ön ödeme ne kadar?" },
    { label: "Tüm fiyatlar", message: "Fiyatlarınız nedir?" },
  ]},
  { category: "Konum/Buluşma", tests: [
    { label: "Buluşma noktası", message: "Nerede buluşacağız?" },
    { label: "Aktivite konumu", message: "Aktivite nerede yapılıyor?" },
    { label: "Ofis adresi", message: "Ofisiniz nerede?" },
    { label: "Transfer", message: "Transfer dahil mi?" },
  ]},
  { category: "SSS Soruları", tests: [
    { label: "Dahil olanlar", message: "Fiyata neler dahil?" },
    { label: "Yaş sınırı", message: "Yaş sınırı var mı?" },
    { label: "Süre", message: "Ne kadar sürüyor?" },
    { label: "İptal politikası", message: "İptal politikası nedir?" },
  ]},
  { category: "Rezervasyon", tests: [
    { label: "Rezervasyon yap", message: "Rezervasyon yapmak istiyorum" },
    { label: "Müsaitlik", message: "Yarın müsait misiniz?" },
    { label: "Onay sorgusu", message: "Rezervasyonum onaylandı mı?" },
  ]},
  { category: "İptal/Değişiklik", tests: [
    { label: "İptal edebilir miyim?", message: "Rezervasyonumu iptal edebilir miyim?" },
    { label: "İptal politikası", message: "İptal ve iade politikanız nedir?" },
    { label: "Tarih değişikliği", message: "Rezervasyon tarihimi değiştirebilir miyim?" },
    { label: "Sipariş no ile", message: "12345 numaralı siparişimi iptal etmek istiyorum" },
  ]},
  { category: "Diğer", tests: [
    { label: "Selamlaşma", message: "Merhaba" },
    { label: "Aktivite listesi", message: "Hangi aktiviteleriniz var?" },
    { label: "Paket turlar", message: "Paket turlarınız var mı?" },
    { label: "Sağlık notu", message: "Hamile bireyler katılabilir mi?" },
    { label: "Ekstralar", message: "Ekstra seçenekler var mı?" },
  ]},
];

export default function BotTest() {
  const [phone, setPhone] = useState("+90532");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async (customMessage?: string) => {
    const msgToSend = customMessage || message;
    if (!phone || !msgToSend.trim()) {
      toast({ title: "Hata", description: "Telefon ve mesaj gereklidir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: phone,
          Body: msgToSend,
        }),
      });

      if (!res.ok) throw new Error("Bot yanıt veremedi");

      const responseText = await res.text();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, "text/xml");
      const messageContent = xmlDoc.getElementsByTagName("Message")[0]?.textContent || responseText;

      setHistory([
        ...history,
        { role: "user", content: msgToSend },
        { role: "assistant", content: messageContent },
      ]);
      setMessage("");
      
    } catch (error) {
      toast({ 
        title: "Hata", 
        description: "Bot test edilirken hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    try {
      await fetch(`/api/messages/clear?phone=${encodeURIComponent(phone)}`, { method: "DELETE" });
      toast({ title: "Temizlendi", description: "Konuşma geçmişi silindi." });
    } catch {
      toast({ title: "Hata", description: "Geçmiş silinemedi.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 xl:ml-64 p-4 pt-16 xl:pt-20 xl:px-8 xl:pb-8 pb-24 space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">WhatsApp Bot Test</h1>
          <p className="text-muted-foreground mt-1">Botu canlı olarak test edin</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="xl:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Sohbet
                </h3>
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Temizle
                </Button>
              </div>
              
              <div className="h-80 overflow-y-auto space-y-3 mb-4 p-2 bg-muted/30 rounded-lg">
                {history.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                    <div>
                      <p className="text-sm">Henüz mesaj yok</p>
                      <p className="text-xs mt-1">Aşağıdan test senaryolarını seçin veya mesaj yazın</p>
                    </div>
                  </div>
                ) : (
                  history.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-background border rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="phone" className="text-xs">Telefon</Label>
                  <Input
                    id="phone"
                    placeholder="+905321234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="message" className="text-xs">Mesaj</Label>
                  <Textarea
                    id="message"
                    placeholder="Mesajınızı yazın..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="h-16 resize-none"
                  />
                </div>
                <Button
                  onClick={() => handleSend()}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Gönder (Enter)
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Test Scenarios */}
          <div className="xl:col-span-2 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Test Senaryoları</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Tıklayarak hızlıca test edin
              </p>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {TEST_SCENARIOS.map((category, cidx) => (
                  <div key={cidx}>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{category.category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {category.tests.map((test, tidx) => (
                        <Button
                          key={tidx}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          disabled={loading}
                          onClick={() => handleSend(test.message)}
                        >
                          {test.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Bot Bilgisi
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <Badge variant="secondary" className="mt-1">GPT-4o</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">AI Model</p>
                  <Badge variant="outline" className="mt-1">GPT-4o</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hafıza</p>
                  <p className="font-medium">Son 5 mesaj</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dil</p>
                  <p className="font-medium">TR / EN</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 text-sm">Test İpuçları</h4>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <li>• Aynı telefon numarasıyla devam soruları sorun</li>
                <li>• "2 kişi için ne kadar?" gibi hesaplama testleri yapın</li>
                <li>• Farklı aktiviteler için ayrı ayrı sorular sorun</li>
                <li>• "Temizle" ile konuşma geçmişini sıfırlayın</li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
