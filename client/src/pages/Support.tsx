import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  HelpCircle,
  Send,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  HelpCircleIcon,
  MoreHorizontal
} from "lucide-react";

export default function Support() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [requestType, setRequestType] = useState("");
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  const { data: emailSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'developerEmail'],
    queryFn: async () => {
      const res = await fetch('/api/settings/developerEmail');
      return res.json();
    },
  });

  const developerEmail = emailSetting?.value || "destek@smartur.com";

  const sendMutation = useMutation({
    mutationFn: async (data: { subject: string; requestType: string; message: string; senderName: string; senderEmail: string; developerEmail: string }) => {
      return apiRequest('POST', '/api/support-request', data);
    },
    onSuccess: () => {
      toast({ title: "Gönderildi", description: "Destek talebiniz başarıyla gönderildi." });
      setSubject("");
      setRequestType("");
      setMessage("");
      setSenderName("");
      setSenderEmail("");
    },
    onError: () => {
      toast({ title: "Hata", description: "Destek talebi gönderilemedi.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !requestType || !message || !senderName) {
      toast({ title: "Uyarı", description: "Lütfen tüm zorunlu alanları doldurun.", variant: "destructive" });
      return;
    }
    sendMutation.mutate({ subject, requestType, message, senderName, senderEmail, developerEmail });
  };

  const requestTypes = [
    { value: "hata", label: "Hata Bildirimi", icon: AlertTriangle, color: "text-red-500" },
    { value: "güncelleme", label: "Güncelleme İsteği", icon: MessageSquare, color: "text-blue-500" },
    { value: "öneri", label: "Öneri", icon: Lightbulb, color: "text-yellow-500" },
    { value: "soru", label: "Soru", icon: HelpCircleIcon, color: "text-purple-500" },
    { value: "diger", label: "Diğer", icon: MoreHorizontal, color: "text-muted-foreground" },
  ];

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 xl:ml-64 p-4 pt-16 xl:p-8 pb-24 xl:pb-8 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-3" data-testid="text-page-title">
            <HelpCircle className="h-8 w-8 text-primary" />
            Destek
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistem sorunlarını, güncelleme isteklerini veya önerilerinizi buradan iletebilirsiniz.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Send className="h-5 w-5" />
              Yeni Destek Talebi
            </CardTitle>
            <CardDescription>
              Talebiniz geliştiriçi ekibine iletilecektir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senderName">Adınız *</Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Adınızı girin"
                    required
                    data-testid="input-sender-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">E-posta Adresiniz (Opsiyonel)</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="E-posta adresiniz"
                    data-testid="input-sender-email"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestType">Talep Türü *</Label>
                  <Select value={requestType} onValueChange={setRequestType} required>
                    <SelectTrigger data-testid="select-request-type">
                      <SelectValue placeholder="Talep türü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {requestTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Konu *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Kısa bir konu başlığı"
                    required
                    data-testid="input-subject"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mesajınız *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Sorununuzu veya isteğinizi detaylı bir şekilde açıklayın..."
                  className="min-h-[150px]"
                  required
                  data-testid="textarea-message"
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={sendMutation.isPending} data-testid="button-send-support">
                  <Send className="h-4 w-4 mr-2" />
                  {sendMutation.isPending ? "Gönderiliyor..." : "Talebi Gönder"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Acil Durumlar</h3>
                <p className="text-sm text-muted-foreground">
                  Acil sistem sorunları için doğrudan geliştiriçi ekibine ulaşabilirsiniz. 
                  Normal talepler genellikle 24-48 saat içinde yanıtlanır.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
