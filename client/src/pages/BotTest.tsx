import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";

export default function BotTest() {
  const [phone, setPhone] = useState("+90532");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!phone || !message.trim()) {
      toast({ title: "Hata", description: "Telefon ve mesaj gereklidir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Test the WhatsApp bot endpoint
      const res = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: phone,
          Body: message,
        }),
      });

      if (!res.ok) throw new Error("Bot yanıt veremedi");

      const responseText = await res.text();
      
      // Parse the XML response to extract message content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, "text/xml");
      const messageContent = xmlDoc.getElementsByTagName("Message")[0]?.textContent || responseText;

      setHistory([
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: messageContent },
      ]);
      setMessage("");
      
      toast({ title: "Başarılı", description: "Bot yanıt verdi." });
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

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 xl:ml-64 p-4 pt-16 xl:p-8 pb-24 xl:pb-8 space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display">WhatsApp Bot Test</h1>
          <p className="text-muted-foreground mt-1">Botu canlı olarak test edin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Chat Messages */}
            <Card className="p-6 h-96 overflow-y-auto space-y-4 flex flex-col">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <p className="text-lg font-semibold mb-2">Henüz mesaj yok</p>
                    <p className="text-sm">Botu test etmek için aşağıda bir mesaj yazın</p>
                  </div>
                </div>
              ) : (
                <>
                  {history.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-foreground rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Card>

            {/* Input Area */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="phone">Telefon Numarası</Label>
                <Input
                  id="phone"
                  placeholder="+905321234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="message">Mesaj</Label>
                <Textarea
                  id="message"
                  placeholder="Botunuza göndermek istediğiniz mesajı yazın..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      handleSend();
                    }
                  }}
                  className="h-24"
                />
              </div>
              <Button
                onClick={handleSend}
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
                    Gönder
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Bot Configuration */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Bot Bilgisi
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Model</p>
                  <Badge variant="secondary">Gemini 1.5 Flash</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Hafıza</p>
                  <p className="font-medium">Son 5 mesaj</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Dil</p>
                  <p className="font-medium">Türkçe</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Durum</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-green-600">Aktif</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">İpuçları</h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Türkçe olarak sorular sorun</li>
                <li>• Bot aktiviteleri ve kapasiteyi görebilir</li>
                <li>• Rezervasyon yapabilir</li>
                <li>• Ctrl+Enter ile hızlı gönder</li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
