import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions, PERMISSION_KEYS } from "@/hooks/use-permissions";
import { Smartphone, QrCode, CheckCircle, Circle, RefreshCw, MessageSquare, Wifi, WifiOff, Plus, Trash2, Ban, Upload, Image, X, Shield, Eye, EyeOff, ExternalLink, Mail, AlertCircle, Download, Server, GitBranch, Clock, Terminal, Key, CalendarHeart, Edit2, CreditCard, AlertTriangle, Loader2, XCircle, Crown, Users, UserPlus, Pencil, Info, Save, Bell, Settings2, Building2, Phone, DollarSign, FileText, HelpCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Holiday, Agency } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Settings() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canManageTemplates = hasPermission(PERMISSION_KEYS.SETTINGS_TEMPLATES_MANAGE);
  const [isSaving, setIsSaving] = useState(false);
  const [reminderHours, setReminderHours] = useState(24);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  
  // Manual reservation confirmation settings
  const [manualConfirmationEnabled, setManualConfirmationEnabled] = useState(true);
  const [manualConfirmationTemplate, setManualConfirmationTemplate] = useState(
    "Merhaba {isim},\n\nRezervasyon talebiniz başarıyla alındı!\n\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\nKişi Sayısı: {kisi}\n\nRezervasyon detayları için:\n{takip_linki}\n\nAktivite saati ve tarih değişikliği talepleriniz için, lütfen yukarıdaki takip linkine tıklayın. (Değişiklik talepleriniz müsaitliğe göre değerlendirilecektir.)\n\nSorularınız için bu numaradan bize ulaşabilirsiniz.\n\nİyi günler dileriz!"
  );
  const [isSavingManualConfirmation, setIsSavingManualConfirmation] = useState(false);
  
  // Account password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [reminderMessage, setReminderMessage] = useState(
    "Merhaba {isim}! Rezervasyonunuz için hatırlatma:\n\n{aktiviteler}\nTarih: {tarih}\n\nRezervasyon detayları için:\n{takip_linki}\n\nAktivite saati ve tarih değişikliği talepleriniz için, lütfen yukarıdaki takip linkine tıklayın. (Değişiklik talepleriniz müsaitliğe göre değerlendirilecektir.)\n\nSizi görmek için sabırsızlanıyoruz!"
  );
  const [botEnabled, setBotEnabled] = useState(true);
  const [botPrompt, setBotPrompt] = useState(
    "Sen bir TURİZM RESERVASYONLARI DANIŞMANI'sın. Müşterilerle Türkçe konuşarak rezervasyon yardımcılığı yap. Kibar, samimi ve profesyonel ol. Müşterinin sorularına hızla cevap ver ve rezervasyon yapmalarına yardımcı ol."
  );
  const [botRules, setBotRules] = useState("");
  const [botRulesLoaded, setBotRulesLoaded] = useState(false);
  const [partnerPrompt, setPartnerPrompt] = useState("");
  const [partnerPromptLoaded, setPartnerPromptLoaded] = useState(false);
  const [viewerPrompt, setViewerPrompt] = useState("");
  const [viewerPromptLoaded, setViewerPromptLoaded] = useState(false);
  const [customerSupportEmail, setCustomerSupportEmail] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [isRefreshingQR, setIsRefreshingQR] = useState(false);
  const [newBlacklistPhone, setNewBlacklistPhone] = useState("");
  const [newBlacklistReason, setNewBlacklistReason] = useState("");
    
  // Bot Access Settings
  const [botAccessActivities, setBotAccessActivities] = useState(true);
  const [botAccessPackageTours, setBotAccessPackageTours] = useState(true);
  const [botAccessCapacity, setBotAccessCapacity] = useState(true);
  const [botAccessFaq, setBotAccessFaq] = useState(true);
  const [botAccessConfirmation, setBotAccessConfirmation] = useState(true);
  const [botAccessTransfer, setBotAccessTransfer] = useState(true);
  const [botAccessExtras, setBotAccessExtras] = useState(true);
  const [botAccessSettingsLoaded, setBotAccessSettingsLoaded] = useState(false);
  
  // General FAQ - Company-wide frequently asked questions
  const [generalFaq, setGeneralFaq] = useState<{ question: string; answer: string }[]>([]);
  const [generalFaqLoaded, setGeneralFaqLoaded] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [isSavingGeneralFaq, setIsSavingGeneralFaq] = useState(false);
  
  // Gmail Settings (legacy - kept for data migration)
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [isSavingGmail, setIsSavingGmail] = useState(false);
  
  // Notification Email Settings
  const [notificationEmail, setNotificationEmail] = useState("");
  const [isSavingNotificationEmail, setIsSavingNotificationEmail] = useState(false);
  
  // Bulk WhatsApp Message Templates (by status) - with labels and content
  const [bulkTemplateConfirmed, setBulkTemplateConfirmed] = useState(
    "Merhaba {isim},\n\nRezervasyon onaylandı!\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nİyi günler dileriz."
  );
  const [bulkTemplatePending, setBulkTemplatePending] = useState(
    "Merhaba {isim},\n\nRezervasyon talebiniz değerlendiriliyor.\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nEn kısa sürede bilgilendirme yapılacaktır."
  );
  const [bulkTemplateCancelled, setBulkTemplateCancelled] = useState(
    "Merhaba {isim},\n\nÜzgünüz, rezervasyonunuz iptal edilmiştir.\nAktivite: {aktivite}\nTarih: {tarih}\n\nDetaylar için: {takip_linki}\n\nSorularınız için bizimle iletişime geçebilirsiniz."
  );
  const [bulkLabelConfirmed, setBulkLabelConfirmed] = useState("Onaylandı");
  const [bulkLabelPending, setBulkLabelPending] = useState("Beklemede");
  const [bulkLabelCancelled, setBulkLabelCancelled] = useState("İptal");
  const [bulkTemplatesLoaded, setBulkTemplatesLoaded] = useState(false);
  
  // WooCommerce Auto-Notification Template
  const [wooNotificationEnabled, setWooNotificationEnabled] = useState(true);
  const [wooNotificationTemplate, setWooNotificationTemplate] = useState(
    "Merhaba {isim},\n\nSiparişiniz alınmıştır!\n\nSipariş No: {siparis_no}\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nRezervasyon detayları ve değişiklik talepleriniz için:\n{takip_linki}\n\nSorularınız için bu numaradan bize ulaşabilirsiniz.\n\nİyi günler dileriz!"
  );
  const [wooNotificationLoaded, setWooNotificationLoaded] = useState(false);
  const [isSavingWooNotification, setIsSavingWooNotification] = useState(false);

  
  // Load session to check user role
  const { data: sessionData } = useQuery<{
    authenticated: boolean;
    user?: { id: number; tenantId?: number };
    roles?: number[];
    permissions?: string[];
  }>({
    queryKey: ['/api/auth/session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      return res.json();
    },
  });

  // Check if user is tenant owner (role ID 4) - only owners can edit bot rules
  const isOwner = sessionData?.roles?.includes(4) || false;

  // Load bot access settings
  const { data: botAccessSettings } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'botAccess'],
    queryFn: async () => {
      const res = await fetch('/api/settings/botAccess');
      return res.json();
    },
  });


  // Load bot prompt
  const { data: botPromptSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'botPrompt'],
    queryFn: async () => {
      const res = await fetch('/api/settings/botPrompt');
      return res.json();
    },
  });

  // Load bot rules
  const { data: botRulesSetting, isFetched: botRulesIsFetched } = useQuery<{ key: string; value: string | null } | null>({
    queryKey: ['/api/settings', 'botRules'],
    queryFn: async () => {
      const res = await fetch('/api/settings/botRules');
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Load partner prompt
  const { data: partnerPromptSetting, isFetched: partnerPromptIsFetched } = useQuery<{ key: string; value: string | null } | null>({
    queryKey: ['/api/settings', 'partner_prompt'],
    queryFn: async () => {
      const res = await fetch('/api/settings/partner_prompt');
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Load viewer prompt
  const { data: viewerPromptSetting, isFetched: viewerPromptIsFetched } = useQuery<{ key: string; value: string | null } | null>({
    queryKey: ['/api/settings', 'viewer_prompt'],
    queryFn: async () => {
      const res = await fetch('/api/settings/viewer_prompt');
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Load general FAQ
  const { data: generalFaqSetting, isFetched: generalFaqIsFetched } = useQuery<{ key: string; value: string | null } | null>({
    queryKey: ['/api/settings', 'generalFaq'],
    queryFn: async () => {
      const res = await fetch('/api/settings/generalFaq');
      if (!res.ok) return null;
      return res.json();
    },
  });

  // State to track if bot prompt has been loaded
  const [botPromptLoaded, setBotPromptLoaded] = useState(false);

  // Load bulk message templates
  const { data: bulkTemplatesSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'bulkMessageTemplates'],
    queryFn: async () => {
      const res = await fetch('/api/settings/bulkMessageTemplates');
      return res.json();
    },
  });

  // Load WooCommerce notification settings
  const { data: wooNotificationSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'wooNotification'],
    queryFn: async () => {
      const res = await fetch('/api/settings/wooNotification');
      return res.json();
    },
  });

  // Load Manual Confirmation notification settings
  const { data: manualConfirmationSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'manualConfirmation'],
    queryFn: async () => {
      const res = await fetch('/api/settings/manualConfirmation');
      return res.json();
    },
  });

  // Load Tenant Integrations (Twilio, WooCommerce, Gmail)
  const { data: tenantIntegrations, refetch: refetchTenantIntegrations } = useQuery<{
    twilioAccountSid: string;
    twilioWhatsappNumber: string;
    twilioConfigured: boolean;
    twilioWebhookUrl: string;
    woocommerceStoreUrl: string;
    woocommerceConsumerKey: string;
    woocommerceConfigured: boolean;
    gmailUser: string;
    gmailFromName: string;
    gmailConfigured: boolean;
  }>({
    queryKey: ['/api/tenant-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/tenant-integrations');
      if (!res.ok) {
        return {
          twilioAccountSid: '', twilioWhatsappNumber: '', twilioConfigured: false, twilioWebhookUrl: '',
          woocommerceStoreUrl: '', woocommerceConsumerKey: '', woocommerceConfigured: false,
          gmailUser: '', gmailFromName: '', gmailConfigured: false,
        };
      }
      return res.json();
    },
  });

  // Apply loaded Gmail settings from tenant integrations
  useEffect(() => {
    if (tenantIntegrations?.gmailUser) {
      setGmailUser(tenantIntegrations.gmailUser);
    }
  }, [tenantIntegrations?.gmailUser]);

  // Apply loaded bot access settings when data arrives (using useEffect)
  useEffect(() => {
    if (botAccessSettings?.value && !botAccessSettingsLoaded) {
      try {
        const settings = JSON.parse(botAccessSettings.value);
        if (settings.enabled !== undefined) setBotEnabled(settings.enabled);
        if (settings.activities !== undefined) setBotAccessActivities(settings.activities);
        if (settings.packageTours !== undefined) setBotAccessPackageTours(settings.packageTours);
        if (settings.capacity !== undefined) setBotAccessCapacity(settings.capacity);
        if (settings.faq !== undefined) setBotAccessFaq(settings.faq);
        if (settings.confirmation !== undefined) setBotAccessConfirmation(settings.confirmation);
        if (settings.transfer !== undefined) setBotAccessTransfer(settings.transfer);
        if (settings.extras !== undefined) setBotAccessExtras(settings.extras);
        setBotAccessSettingsLoaded(true);
      } catch {}
    }
  }, [botAccessSettings?.value, botAccessSettingsLoaded]);


  // Apply loaded bot prompt when data arrives
  useEffect(() => {
    if (botPromptSetting?.value && !botPromptLoaded) {
      setBotPrompt(botPromptSetting.value);
      setBotPromptLoaded(true);
    }
  }, [botPromptSetting?.value, botPromptLoaded]);

  // Default bot rules (14 Madde) - must match backend DEFAULT_BOT_RULES
  // These rules are ONLY for normal customers. Partner/Viewer rules are in persona-specific prompts.
  const DEFAULT_BOT_RULES = `Bu kurallar SADECE normal müşteriler için geçerlidir. Partner veya İzleyici ise PERSONA KURALLARINI uygula!

1. ETKİNLİK BİLGİSİ: Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.

2. MÜSAİTLİK/KONTENJAN: Yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ'ndeki yarın tarihini kullan.

3. MÜSAİTLİK BİLGİSİ YOKSA: "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.

4. ESKALASYON: Karmaşık konularda, şikayetlerde, veya 2 mesaj içinde çözülemeyen sorunlarda "Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir" de.

5. ÖZEL TALEPLER: Fiyat indirimi, grup indirimi gibi özel taleplerde yetkili yönlendirmesi yap.

6. REZERVASYON SORGUSU: Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.

7. TRANSFER: Aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et.

8. EKSTRA HİZMET: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda "Ekstra Hizmetler" listesini kullan.

9. PAKET TUR: Birden fazla aktivite içeren paket turlar hakkında soru sorarsa PAKET TURLAR bölümünü kullan.

10. SIK SORULAN SORULAR: Her aktivite için tanımlı SSS bölümünü kontrol et.

11. SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa ve onay mesajı isterse, "Türkçe Sipariş Onay Mesajı" alanını olduğu gibi ilet.

12. MÜŞTERİ MÜSAİTLİK (SADECE MÜŞTERİLER): Müsaitlik bilgisini paylaş, rezervasyon yapmak isterse web sitesi linkini paylaş. (Partner/İzleyicilere link VERME!)

13. MÜŞTERİ DEĞİŞİKLİK (SADECE MÜŞTERİLER): Takip linkinden değişiklik talebini oluşturabileceklerini söyle. (Partner/İzleyicilere takip linki VERME - panele yönlendir!)

14. REZERVASYON LİNKİ (SADECE MÜŞTERİLER): İngilizce konuşuyorsan "EN Reservation Link", Türkçe konuşuyorsan "TR Rezervasyon Linki" kullan. (Partner/İzleyicilere link VERME!)`;

  // Apply loaded bot rules when data arrives
  useEffect(() => {
    if (!botRulesLoaded && botRulesIsFetched) {
      if (botRulesSetting?.value) {
        setBotRules(botRulesSetting.value);
      } else {
        setBotRules(DEFAULT_BOT_RULES);
      }
      setBotRulesLoaded(true);
    }
  }, [botRulesSetting, botRulesLoaded, botRulesIsFetched]);

  // Default partner prompt
  const DEFAULT_PARTNER_PROMPT = `Partner acentalara FARKLI davran:
1. Rezervasyon veya web sitesi linki VERME - bunun yerine müsaitlik/kapasite bilgisi paylaş
2. Partner fiyatlarını kullan (eğer varsa)
3. Daha profesyonel ve iş odaklı iletişim kur

MÜSAİTLİK SORGULARINDA:
- Sorulan tarih ve saat için müsaitlik bilgisini paylaş
- Ardından "Smartur panelinizden rezervasyon talebinizi oluşturabilirsiniz" de

DEĞİŞİKLİK TALEPLERİNDE:
- Partner tarih/saat değişikliği isterse "Smartur panelinizden değişiklik talebinizi oluşturabilirsiniz" de
- Takip linki veya web sitesi linki VERME`;

  // Default viewer prompt
  const DEFAULT_VIEWER_PROMPT = `İzleyicilere FARKLI davran:
1. Rezervasyon veya web sitesi linki VERME
2. Daha profesyonel ve iş odaklı iletişim kur
3. İzleyicinin sisteme giriş yaparak işlem yapması gerektiğini belirt

MÜSAİTLİK SORGULARINDA:
- Sorulan tarih ve saat için müsaitlik bilgisini paylaş
- Ardından "Smartur panelinize giriş yaparak istediğiniz aktiviteyi seçip rezervasyon talebi oluşturabilirsiniz" de

REZERVASYON TALEPLERİNDE:
- İzleyici WhatsApp'tan rezervasyon yapmak isterse "Smartur panelinize giriş yaparak kolayca rezervasyon talebi oluşturabilirsiniz. Aktiviteyi seçin, tarih ve kişi sayısını belirtin" de
- WhatsApp üzerinden rezervasyon ALMA - panele yönlendir

DEĞİŞİKLİK TALEPLERİNDE:
- İzleyici tarih/saat değişikliği isterse "Smartur panelinizden değişiklik talebinizi oluşturabilirsiniz" de
- Takip linki veya web sitesi linki VERME`;

  // Apply loaded partner prompt when data arrives
  useEffect(() => {
    if (!partnerPromptLoaded && partnerPromptIsFetched) {
      if (partnerPromptSetting?.value) {
        setPartnerPrompt(partnerPromptSetting.value);
      } else {
        setPartnerPrompt(DEFAULT_PARTNER_PROMPT);
      }
      setPartnerPromptLoaded(true);
    }
  }, [partnerPromptSetting, partnerPromptLoaded, partnerPromptIsFetched]);

  // Apply loaded viewer prompt when data arrives
  useEffect(() => {
    if (!viewerPromptLoaded && viewerPromptIsFetched) {
      if (viewerPromptSetting?.value) {
        setViewerPrompt(viewerPromptSetting.value);
      } else {
        setViewerPrompt(DEFAULT_VIEWER_PROMPT);
      }
      setViewerPromptLoaded(true);
    }
  }, [viewerPromptSetting, viewerPromptLoaded, viewerPromptIsFetched]);

  // Apply loaded general FAQ when data arrives
  useEffect(() => {
    if (!generalFaqLoaded && generalFaqIsFetched) {
      if (generalFaqSetting?.value) {
        try {
          const faqData = JSON.parse(generalFaqSetting.value);
          if (Array.isArray(faqData)) {
            setGeneralFaq(faqData);
          }
        } catch {}
      }
      setGeneralFaqLoaded(true);
    }
  }, [generalFaqSetting, generalFaqLoaded, generalFaqIsFetched]);

  // Apply loaded bulk message templates when data arrives (with backwards compatibility)
  useEffect(() => {
    if (bulkTemplatesSetting?.value && !bulkTemplatesLoaded) {
      try {
        const templates = JSON.parse(bulkTemplatesSetting.value);
        // Support both old format (string) and new format ({ label, content })
        if (templates.confirmed) {
          if (typeof templates.confirmed === 'string') {
            setBulkTemplateConfirmed(templates.confirmed);
          } else {
            if (templates.confirmed.content) setBulkTemplateConfirmed(templates.confirmed.content);
            if (templates.confirmed.label) setBulkLabelConfirmed(templates.confirmed.label);
          }
        }
        if (templates.pending) {
          if (typeof templates.pending === 'string') {
            setBulkTemplatePending(templates.pending);
          } else {
            if (templates.pending.content) setBulkTemplatePending(templates.pending.content);
            if (templates.pending.label) setBulkLabelPending(templates.pending.label);
          }
        }
        if (templates.cancelled) {
          if (typeof templates.cancelled === 'string') {
            setBulkTemplateCancelled(templates.cancelled);
          } else {
            if (templates.cancelled.content) setBulkTemplateCancelled(templates.cancelled.content);
            if (templates.cancelled.label) setBulkLabelCancelled(templates.cancelled.label);
          }
        }
        setBulkTemplatesLoaded(true);
      } catch {}
    }
  }, [bulkTemplatesSetting?.value, bulkTemplatesLoaded]);

  // Apply loaded WooCommerce notification settings
  useEffect(() => {
    if (wooNotificationSetting?.value && !wooNotificationLoaded) {
      try {
        const settings = JSON.parse(wooNotificationSetting.value);
        if (settings.enabled !== undefined) setWooNotificationEnabled(settings.enabled);
        if (settings.template) setWooNotificationTemplate(settings.template);
        setWooNotificationLoaded(true);
      } catch {}
    }
  }, [wooNotificationSetting?.value, wooNotificationLoaded]);

  // Apply loaded Manual Confirmation notification settings
  const [manualConfirmationLoaded, setManualConfirmationLoaded] = useState(false);
  useEffect(() => {
    if (manualConfirmationSetting?.value && !manualConfirmationLoaded) {
      try {
        const settings = JSON.parse(manualConfirmationSetting.value);
        if (settings.enabled !== undefined) setManualConfirmationEnabled(settings.enabled);
        if (settings.template) setManualConfirmationTemplate(settings.template);
        setManualConfirmationLoaded(true);
      } catch {}
    }
  }, [manualConfirmationSetting?.value, manualConfirmationLoaded]);

  // Save WooCommerce notification template
  const handleSaveWooNotification = async () => {
    setIsSavingWooNotification(true);
    try {
      const response = await fetch('/api/settings/wooNotification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: JSON.stringify({
            template: wooNotificationTemplate
          })
        }),
      });
      if (response.ok) {
        toast({ title: "Başarılı", description: "WooCommerce bildirim şablonu kaydedildi." });
      } else {
        throw new Error("Kaydetme başarısız");
      }
    } catch (err) {
      toast({ title: "Hata", description: "Şablon kaydedilemedi.", variant: "destructive" });
    } finally {
      setIsSavingWooNotification(false);
    }
  };

  const handleSaveGmailSettings = async () => {
    if (!gmailUser || !gmailPassword) {
      toast({ title: "Hata", description: "Gmail adresi ve uygulama şifresi gerekli.", variant: "destructive" });
      return;
    }
    
    setIsSavingGmail(true);
    try {
      const res = await fetch('/api/tenant-integrations/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmailUser, gmailPassword, gmailFromName: gmailUser })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast({ title: "Başarılı", description: data.message || "Gmail ayarları kaydedildi." });
        setGmailPassword("");
        await refetchTenantIntegrations();
      } else {
        toast({ title: "Hata", description: data.error || "Gmail ayarları kaydedilemedi.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Hata", description: "Gmail ayarları kaydedilemedi.", variant: "destructive" });
    } finally {
      setIsSavingGmail(false);
    }
  };

  const handleTestGmailConnection = async () => {
    setIsTestingGmail(true);
    try {
      const res = await fetch('/api/tenant-integrations/gmail/test', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "Başarılı", description: data.message || "Gmail baglantisi başarılı!" });
      } else {
        toast({ title: "Hata", description: data.error || "Gmail baglantisi başarısız.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Hata", description: "Gmail baglantisi test edilemedi.", variant: "destructive" });
    } finally {
      setIsTestingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const res = await fetch('/api/tenant-integrations/gmail', { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Başarılı", description: "Gmail baglantisi kaldırıldı." });
        setGmailUser("");
        setGmailPassword("");
        await refetchTenantIntegrations();
      }
    } catch (err) {
      toast({ title: "Hata", description: "Gmail baglantisi kaldırilamadi.", variant: "destructive" });
    }
  };
  
  // Load notification email setting from tenant settings
  const { data: notificationEmailSetting } = useQuery<{ value: string | null }>({
    queryKey: ['/api/settings', 'tenantNotificationEmail'],
    queryFn: async () => {
      const res = await fetch('/api/settings/tenantNotificationEmail');
      return res.json();
    },
  });
  
  useEffect(() => {
    if (notificationEmailSetting?.value) {
      setNotificationEmail(notificationEmailSetting.value);
    }
  }, [notificationEmailSetting?.value]);
  
  const handleSaveNotificationEmail = async () => {
    setIsSavingNotificationEmail(true);
    try {
      await apiRequest('POST', '/api/settings/tenantNotificationEmail', { value: notificationEmail });
      toast({ title: "Başarılı", description: "Bildirim e-postası kaydedildi." });
      queryClient.invalidateQueries({ queryKey: ['/api/settings', 'tenantNotificationEmail'] });
    } catch (err) {
      toast({ title: "Hata", description: "E-posta kaydedilemedi.", variant: "destructive" });
    } finally {
      setIsSavingNotificationEmail(false);
    }
  };

  interface BlacklistEntry {
    id: number;
    phone: string;
    reason?: string;
    createdAt: string;
  }

  const { data: blacklist, isLoading: isBlacklistLoading } = useQuery<BlacklistEntry[]>({
    queryKey: ['/api/blacklist'],
    queryFn: async () => {
      const res = await fetch('/api/blacklist');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const addToBlacklistMutation = useMutation({
    mutationFn: async ({ phone, reason }: { phone: string; reason?: string }) => {
      return apiRequest('POST', '/api/blacklist', { phone, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist'] });
      setNewBlacklistPhone("");
      setNewBlacklistReason("");
      toast({ title: "Eklendi", description: "Numara kara listeye eklendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Numara eklenemedi.", variant: "destructive" });
    }
  });

  const removeFromBlacklistMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/blacklist/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist'] });
      toast({ title: "Silindi", description: "Numara kara listeden silindi." });
    }
  });

  const handleRefreshQR = () => {
    setIsRefreshingQR(true);
    setTimeout(() => {
      setIsRefreshingQR(false);
      toast({
        title: "QR Kod Yenilendi",
        description: "Yeni QR kodu telefonunuzla tarayabilirsiniz."
      });
    }, 1500);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Build bot access settings object
      const botAccessValue = JSON.stringify({
        enabled: botEnabled,
        activities: botAccessActivities,
        packageTours: botAccessPackageTours,
        capacity: botAccessCapacity,
        faq: botAccessFaq,
        confirmation: botAccessConfirmation,
        transfer: botAccessTransfer,
        extras: botAccessExtras
      });

      // Save all settings
      const savePromises = [
        fetch("/api/settings/customerSupportEmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: customerSupportEmail })
        }),
        fetch("/api/settings/botPrompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: botPrompt })
        }),
        fetch("/api/settings/bot_rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: botRules })
        }),
        fetch("/api/settings/partner_prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: partnerPrompt })
        }),
        fetch("/api/settings/viewer_prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: viewerPrompt })
        }),
        fetch("/api/settings/reminderHours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: String(reminderHours) })
        }),
        fetch("/api/settings/reminderMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: reminderMessage })
        }),
        fetch("/api/settings/botAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: botAccessValue })
        }),
        fetch("/api/settings/bulkMessageTemplates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: JSON.stringify({
            confirmed: { label: bulkLabelConfirmed, content: bulkTemplateConfirmed },
            pending: { label: bulkLabelPending, content: bulkTemplatePending },
            cancelled: { label: bulkLabelCancelled, content: bulkTemplateCancelled }
          }) })
        })
      ];

      await Promise.all(savePromises);
      
      toast({ 
        title: "Başarılı", 
        description: "Ayarlar kaydedildi."
      });
    } catch (err) {
      toast({ 
        title: "Hata", 
        description: "Ayarlar kaydedilemedi.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!currentPassword) {
      setPasswordError("Mevcut şifrenizi girmelisiniz.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Yeni şifrenizi girmelisiniz.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || "Şifre değiştirilemedi.");
        toast({ 
          title: "Hata", 
          description: data.error || "Şifre değiştirilemedi.", 
          variant: "destructive" 
        });
        return;
      }

      // Clear fields on success
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordError("");

      toast({ 
        title: "Başarılı", 
        description: "Şifreniz başarıyla değiştirildi."
      });
    } catch (err) {
      setPasswordError("Şifre değiştirme işlemi başarısız.");
      toast({ 
        title: "Hata", 
        description: "Şifre değiştirilemedi.", 
        variant: "destructive" 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Get current location from wouter
  const [location] = useLocation();

  // Settings tab state - read from URL query parameter if present
  const [settingsTab, setSettingsTab] = useState('security');

  // Update tab when URL changes (e.g., clicking sidebar links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['security', 'whatsapp', 'integrations', 'holidays', 'system', 'data', 'partners', 'notifications'].includes(tab)) {
      setSettingsTab(tab);
    }
  }, [location]);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-display">Ayarlar</h1>
          <p className="text-muted-foreground mt-1">Sistem yapılandırması</p>
        </div>

        {/* Settings Navigation - Wide format like SuperAdmin */}
        <div className="border-b bg-background mb-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            <Button
              variant={settingsTab === 'security' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('security')}
              data-testid="tab-security"
            >
              <Shield className="h-4 w-4 mr-2" />
              Guvenlik
            </Button>
            <Button
              variant={settingsTab === 'notifications' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('notifications')}
              data-testid="tab-notifications"
            >
              <Bell className="h-4 w-4 mr-2" />
              Bildirimler
            </Button>
            <Button
              variant={settingsTab === 'whatsapp' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('whatsapp')}
              data-testid="tab-whatsapp"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant={settingsTab === 'integrations' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('integrations')}
              data-testid="tab-integrations"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Entegrasyonlar
            </Button>
            <Button
              variant={settingsTab === 'partners' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('partners')}
              data-testid="tab-partners"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Partnerler
            </Button>
            <Button
              variant={settingsTab === 'holidays' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('holidays')}
              data-testid="tab-holidays"
            >
              <CalendarHeart className="h-4 w-4 mr-2" />
              Tatiller
            </Button>
            <Button
              variant={settingsTab === 'data' ? "default" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('data')}
              data-testid="tab-data"
            >
              <Download className="h-4 w-4 mr-2" />
              Veri
            </Button>
          </div>
        </div>

        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">

          {/* SECURITY TAB */}
          <TabsContent value="security" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Hesap Ayarları
              </CardTitle>
              <CardDescription>
                Hesabıniza ait şifrenizi değiştirebilirsiniz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                  <div className="relative">
                    <Input 
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="Mevcut şifrenizi girin"
                      data-testid="input-current-password"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <div className="relative">
                      <Input 
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="Yeni şifrenizi girin"
                        data-testid="input-new-password"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{showPassword ? "Şifreyi gizle" : "Şifreyi göster"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPasswordConfirm">Yeni Şifre Tekrar</Label>
                    <Input 
                      id="newPasswordConfirm"
                      type={showPassword ? "text" : "password"}
                      value={newPasswordConfirm}
                      onChange={(e) => {
                        setNewPasswordConfirm(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="Yeni şifreyi tekrar girin"
                      data-testid="input-new-password-confirm"
                    />
                  </div>
                </div>

                {passwordError && (
                  <p className="text-sm text-destructive mt-2">{passwordError}</p>
                )}

                <Button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !newPasswordConfirm}
                  data-testid="button-change-password"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Değiştiriliyor...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Şifreyi Değiştir
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Şifrenizi değiştirdikten sonra yeni şifrenizle giriş yapmaniz gerekecektir.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                E-posta Bildirimleri
              </CardTitle>
              <CardDescription>
                Destek talepleri ve sistem bildirimleri için e-posta adresinizi ayarlayın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-300">Merkezi E-posta Sistemi</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      E-postalar platform tarafından merkezi olarak gönderilmektedir. Sadece bildirim alacağınız e-posta adresini belirtin.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notificationEmail">Bildirim E-posta Adresi</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="notificationEmail"
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      placeholder="bildirim@acenteniz.com"
                      className="max-w-md"
                      data-testid="input-notification-email"
                    />
                    <Button
                      onClick={handleSaveNotificationEmail}
                      disabled={isSavingNotificationEmail}
                      data-testid="button-save-notification-email"
                    >
                      {isSavingNotificationEmail ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bu adrese müşteri talepleri, rezervasyon bildirimleri ve sistem uyarıları gönderilir.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Management Section - moved from Users tab */}
          <UserManagementSection />

          </TabsContent>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications" className="space-y-6">
            <NotificationPreferencesTab onNavigateToTemplate={(tab, subTab) => {
              setSettingsTab(tab);
              if (subTab) {
                setTimeout(() => {
                  const subTabTrigger = document.querySelector(`[data-testid="tab-whatsapp-${subTab}"]`) as HTMLButtonElement;
                  if (subTabTrigger) subTabTrigger.click();
                }, 100);
              }
            }} />
          </TabsContent>

          {/* WHATSAPP TAB */}
          <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Otomasyon Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-0.5 mb-4">
                <Label>Yeni Rezervasyon Onay Mesajı Şablonu</Label>
                <p className="text-sm text-muted-foreground">
                  Yeni rezervasyon bildirimi açıkken müşteriye gönderilecek mesaj. 
                  <span className="text-primary"> Bildirimi açmak/kapatmak için Bildirimler sekmesini kullanın.</span>
                </p>
              </div>
              
              <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                {!canManageTemplates && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Bu şablonu sadece acenta sahibi düzenleyebilir
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="manualConfirmationTemplate">Onay Mesajı Şablonu</Label>
                  <p className="text-xs text-muted-foreground mb-1">Aktivitede özel mesaj tanımlanmamışsa bu şablon kullanılır.</p>
                  <Textarea 
                    id="manualConfirmationTemplate"
                    value={manualConfirmationTemplate}
                    onChange={(e) => setManualConfirmationTemplate(e.target.value)}
                    placeholder="Mesaj şablonunuzu yazın..."
                    className="min-h-[150px]"
                    disabled={!canManageTemplates}
                    data-testid="textarea-manual-confirmation-template"
                  />
                  <p className="text-xs text-muted-foreground">
                    Desteklenen değişkenler: {"{isim}"}, {"{aktivite}"}, {"{tarih}"}, {"{saat}"}, {"{kisi}"}, {"{takip_linki}"}
                  </p>
                </div>
                {canManageTemplates && (
                  <Button 
                    onClick={async () => {
                      setIsSavingManualConfirmation(true);
                      try {
                        await fetch('/api/settings/manualConfirmation', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            value: JSON.stringify({
                              template: manualConfirmationTemplate
                            })
                          }),
                        });
                        toast({ title: "Kaydedildi", description: "Onay mesajı şablonu güncellendi." });
                      } catch (error) {
                        toast({ title: "Hata", description: "Şablon kaydedilemedi.", variant: "destructive" });
                      } finally {
                        setIsSavingManualConfirmation(false);
                      }
                    }}
                    disabled={isSavingManualConfirmation}
                    data-testid="button-save-manual-confirmation"
                  >
                    {isSavingManualConfirmation ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Şablonu Kaydet
                  </Button>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <Label>Otomatik Hatırlatma</Label>
                    <p className="text-sm text-muted-foreground">Aktiviteye belirtilen süre kala WhatsApp hatırlatma gönder</p>
                  </div>
                  <Switch 
                    checked={reminderEnabled} 
                    onCheckedChange={setReminderEnabled}
                  />
                </div>
                
                {reminderEnabled && (
                  <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="reminderHours">Kaç saat kala hatırlatma yapılsın?</Label>
                      <div className="flex gap-2 items-end">
                        <Input 
                          id="reminderHours"
                          type="number" 
                          min="1"
                          max="72"
                          value={reminderHours}
                          onChange={(e) => setReminderHours(Math.max(1, Math.min(72, Number(e.target.value))))}
                          placeholder="Saat cinsinden girin..."
                          className="flex-1"
                        />
                        <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                          saat
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        1-72 saat arasında ayarlayın (Varsayılan: 24 saat)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reminderMessage">Hatırlatma Mesajı</Label>
                      <Textarea 
                        id="reminderMessage"
                        value={reminderMessage}
                        onChange={(e) => setReminderMessage(e.target.value)}
                        placeholder="Hatırlatma mesajınızı yazın..."
                        className="min-h-[120px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Desteklenen değişkenler:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}isim{'}'}</code> - Müşteri adı</div>
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}tarih{'}'}</code> - Rezervasyon tarihi</div>
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}aktiviteler{'}'}</code> - Aktivite adları</div>
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}saatler{'}'}</code> - Aktivite saatleri</div>
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}takip_linki{'}'}</code> - Takip linki</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Bot Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="connection" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="connection" data-testid="tab-whatsapp-connection">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Baglanti
                  </TabsTrigger>
                  <TabsTrigger value="bot" data-testid="tab-whatsapp-bot">Bot Ayarları</TabsTrigger>
                  <TabsTrigger value="templates" data-testid="tab-whatsapp-templates">Sablonlar</TabsTrigger>
                  <TabsTrigger value="bot-test" data-testid="tab-whatsapp-bot-test">Bot Test</TabsTrigger>
                  <TabsTrigger value="support" data-testid="tab-whatsapp-support">Destek</TabsTrigger>
                </TabsList>

                <TabsContent value="connection" className="space-y-6 mt-4">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${whatsappConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                          {whatsappConnected ? (
                            <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <WifiOff className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Bağlantı Durumu</p>
                          <Badge variant={whatsappConnected ? "default" : "secondary"} className="mt-1">
                            {whatsappConnected ? "Bağlı" : "Bağlı Değil"}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">QR Kod ile Bağlan</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleRefreshQR}
                                disabled={isRefreshingQR}
                                data-testid="button-refresh-qr"
                              >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingQR ? 'animate-spin' : ''}`} />
                                Yenile
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>QR kodu yenile</TooltipContent>
                          </Tooltip>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border flex items-center justify-center min-h-[200px]">
                          {isRefreshingQR ? (
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                              <RefreshCw className="w-8 h-8 animate-spin" />
                              <span className="text-sm">QR kod yükleniyor...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                                <QrCode className="w-24 h-24 text-muted-foreground/50" />
                              </div>
                              <p className="text-xs text-muted-foreground text-center">
                                QR kod burada görünecek
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                              WhatsApp Botunu Nasıl Aktif Edersiniz?
                            </h4>
                            <ol className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">1</span>
                                </div>
                                <span>Telefonunuzda <strong>WhatsApp Business</strong> uygulamasını açın</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">2</span>
                                </div>
                                <span><strong>Ayarlar &gt; Bağlı Cihazlar</strong> menüsüne gidin</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">3</span>
                                </div>
                                <span><strong>"Cihaz Bağla"</strong> butonuna dokunun</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">4</span>
                                </div>
                                <span>Soldaki <strong>QR kodu</strong> telefonunuzla tarayın</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">5</span>
                                </div>
                                <span>Bağlantı kurulduğunda durum <strong>"Bağlı"</strong> olarak değişecek</span>
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Circle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="font-medium text-amber-900 dark:text-amber-200 mb-1">
                              Önemli Notlar
                            </h4>
                            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                              <li>Telefonunuzun internete bağlı olduğundan emin olun</li>
                              <li>QR kod 60 saniye geçerlidir, süre dolarsa yenileyin</li>
                              <li>Bağlantı koptuğunda bot otomatik mesaj gönderemez</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bot" className="space-y-6 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>WhatsApp Botunu Etkinleştir</Label>
                      <p className="text-sm text-muted-foreground">Müşterilerle otomatik konuşmalar için bot'u aç/kapat</p>
                    </div>
                    <Switch 
                      checked={botEnabled} 
                      onCheckedChange={setBotEnabled}
                    />
                  </div>

                  {botEnabled && (
                    <div className="space-y-6">
                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-2">
                          <Label htmlFor="botPrompt">Bot Sistemi Prompt'u</Label>
                          <Textarea 
                            id="botPrompt"
                            value={botPrompt}
                            onChange={(e) => setBotPrompt(e.target.value)}
                            placeholder="Bot'un nasıl davranacağını tanımlayan talimatleri yazın..."
                            className="min-h-[150px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            Bu prompt'u değiştirerek bot'un kişiliğini ve davranışını özelleştirebilirsiniz. Bot bu talimatlara uyarak müşterilerle konuşacak.
                          </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-900 dark:text-blue-200">
                            <strong>Ipucu:</strong> Prompt'unuzda müşterilerle samimi olmalarini, kibar olmalarini, hızlı cevap vermelerini ve rezervasyon yapmalarina yardimci olmalarini belirtin.
                          </p>
                        </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Bot Kural Hiyerarşisi</h4>
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                              Bot, mesaj atan kişinin kimliğine göre farklı kurallar uygular:
                            </p>
                            <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 ml-4 list-disc">
                              <li><strong>Partner:</strong> Partner talimatları uygulanır (link paylaşılmaz, panele yönlendirilir)</li>
                              <li><strong>İzleyici:</strong> İzleyici talimatları uygulanır (panelden talep oluşturması istenir)</li>
                              <li><strong>Müşteri:</strong> Aşağıdaki genel kurallar uygulanır (link paylaşılır, takip linki verilir)</li>
                            </ul>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-2">
                              <strong>Öncelik:</strong> Partner/İzleyici talimatları, genel kuralların üstündedir.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="botRules" className="text-base font-medium">Bot Kuralları (Müşteriler İçin)</Label>
                            {!isOwner && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Kilitli
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Bu kurallar sadece normal müşteriler için geçerlidir. Partner ve izleyiciler için aşağıdaki özel talimatlar kullanılır. {!isOwner && "Bu alan sadece acenta yöneticisi tarafından düzenlenebilir."}
                          </p>
                          <Textarea 
                            id="botRules"
                            value={botRules}
                            onChange={(e) => isOwner && setBotRules(e.target.value)}
                            placeholder="1. Müşterilere her zaman nazik ve profesyonel ol&#10;2. Fiyat bilgisi verirken net rakamlar kullan&#10;3. Rezervasyon detaylarını mutlaka teyit et&#10;..."
                            className={cn("min-h-[250px] font-mono text-sm", !isOwner && "bg-muted cursor-not-allowed")}
                            disabled={!isOwner}
                            readOnly={!isOwner}
                            data-testid="textarea-bot-rules"
                          />
                          <p className="text-xs text-muted-foreground">
                            Her kuralı yeni satırda yazın. Bot bu kurallara sıkı sıkıya uyacak şekilde yapılandırılmıştır.
                          </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-xs text-amber-900 dark:text-amber-200">
                            <strong>Önemli:</strong> Bu kurallar bot'un davranışını doğrudan etkiler. Yaptığınız değişiklikler kaydedildikten sonra bot yeni kurallara göre çalışmaya başlar.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="partnerPrompt" className="text-base font-medium">Partner Acenta Talimatları</Label>
                            {!isOwner && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Kilitli
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Partner acentalardan gelen mesajlara bot'un nasıl yanıt vereceğini belirleyin. {!isOwner && "Bu alan sadece acenta yöneticisi tarafından düzenlenebilir."}
                          </p>
                          <Textarea 
                            id="partnerPrompt"
                            value={partnerPrompt}
                            onChange={(e) => isOwner && setPartnerPrompt(e.target.value)}
                            placeholder="Partner acentalara rezervasyon linki verme, sadece müsaitlik bilgisi paylaş. Smartur panelinizden rezervasyon oluşturabilirsiniz de..."
                            className={cn("min-h-[150px] font-mono text-sm", !isOwner && "bg-muted cursor-not-allowed")}
                            disabled={!isOwner}
                            readOnly={!isOwner}
                            data-testid="textarea-partner-prompt"
                          />
                          <p className="text-xs text-muted-foreground">
                            Partner acentalar Smartur kullanan diğer acentalardır. Bu talimatlar partner telefonundan mesaj geldiğinde kullanılır.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="viewerPrompt" className="text-base font-medium">İzleyici Kullanıcı Talimatları</Label>
                            {!isOwner && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Kilitli
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            İzleyici rolündeki kullanıcılardan gelen mesajlara bot'un nasıl yanıt vereceğini belirleyin. {!isOwner && "Bu alan sadece acenta yöneticisi tarafından düzenlenebilir."}
                          </p>
                          <Textarea 
                            id="viewerPrompt"
                            value={viewerPrompt}
                            onChange={(e) => isOwner && setViewerPrompt(e.target.value)}
                            placeholder="İzleyicilere rezervasyon linki verme, sadece müsaitlik bilgisi paylaş. Rezervasyon talebi için operatörlerle iletişime geçmelerini öner..."
                            className={cn("min-h-[150px] font-mono text-sm", !isOwner && "bg-muted cursor-not-allowed")}
                            disabled={!isOwner}
                            readOnly={!isOwner}
                            data-testid="textarea-viewer-prompt"
                          />
                          <p className="text-xs text-muted-foreground">
                            İzleyiciler acentanızın sadece müsaitlik görebilen kullanıcılarıdır. Bu talimatlar izleyici telefonundan mesaj geldiğinde kullanılır.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">Bot Erişim Ayarları</Label>
                          <p className="text-sm text-muted-foreground">
                            Bot'un hangi bilgilere erişebileceğini seçin. Kapatılan bilgiler bot'a gönderilmez.
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Aktivite Bilgileri</Label>
                              <p className="text-xs text-muted-foreground">Aktivite açıklamalari, fiyatlar ve rezervasyon linkleri</p>
                            </div>
                            <Switch 
                              checked={botAccessActivities} 
                              onCheckedChange={setBotAccessActivities}
                              data-testid="switch-bot-access-activities"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Paket Tur Bilgileri</Label>
                              <p className="text-xs text-muted-foreground">Paket tur açıklamalari, fiyatlar ve rezervasyon linkleri</p>
                            </div>
                            <Switch 
                              checked={botAccessPackageTours} 
                              onCheckedChange={setBotAccessPackageTours}
                              data-testid="switch-bot-access-package-tours"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Kapasite / Takvim</Label>
                              <p className="text-xs text-muted-foreground">Müsaitlik ve kontenjan bilgileri</p>
                            </div>
                            <Switch 
                              checked={botAccessCapacity} 
                              onCheckedChange={setBotAccessCapacity}
                              data-testid="switch-bot-access-capacity"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Sik Sorulan Sorular (SSS)</Label>
                              <p className="text-xs text-muted-foreground">Aktivite ve paket turlar için tanımlı SSS'ler</p>
                            </div>
                            <Switch 
                              checked={botAccessFaq} 
                              onCheckedChange={setBotAccessFaq}
                              data-testid="switch-bot-access-faq"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Onay Mesajları</Label>
                              <p className="text-xs text-muted-foreground">Sipariş tamamlandıginda gönderilecek onay mesajları</p>
                            </div>
                            <Switch 
                              checked={botAccessConfirmation} 
                              onCheckedChange={setBotAccessConfirmation}
                              data-testid="switch-bot-access-confirmation"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Transfer Bilgileri</Label>
                              <p className="text-xs text-muted-foreground">Ücretsiz otel transferi bolgeleri</p>
                            </div>
                            <Switch 
                              checked={botAccessTransfer} 
                              onCheckedChange={setBotAccessTransfer}
                              data-testid="switch-bot-access-transfer"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2">
                            <div className="space-y-0.5">
                              <Label>Ekstra Hizmetler</Label>
                              <p className="text-xs text-muted-foreground">Aktivitelere eklenebilecek ekstra hizmetler ve fiyatlari</p>
                            </div>
                            <Switch 
                              checked={botAccessExtras} 
                              onCheckedChange={setBotAccessExtras}
                              data-testid="switch-bot-access-extras"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Ban className="w-5 h-5" />
                            <Label className="text-base font-medium">Kara Liste</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Bot bu numaralara asla otomatik cevap vermez
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Input 
                            placeholder="Telefon numarası (örn: 5321234567)"
                            value={newBlacklistPhone}
                            onChange={(e) => setNewBlacklistPhone(e.target.value)}
                            className="flex-1"
                            data-testid="input-blacklist-phone"
                          />
                          <Input 
                            placeholder="Sebep (opsiyonel)"
                            value={newBlacklistReason}
                            onChange={(e) => setNewBlacklistReason(e.target.value)}
                            className="flex-1"
                            data-testid="input-blacklist-reason"
                          />
                          <Button 
                            onClick={() => {
                              if (newBlacklistPhone.trim()) {
                                addToBlacklistMutation.mutate({ 
                                  phone: newBlacklistPhone.trim(), 
                                  reason: newBlacklistReason.trim() || undefined 
                                });
                              }
                            }}
                            disabled={!newBlacklistPhone.trim() || addToBlacklistMutation.isPending}
                            data-testid="button-add-blacklist"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Ekle
                          </Button>
                        </div>

                        {isBlacklistLoading ? (
                          <div className="text-sm text-muted-foreground">Yükleniyor...</div>
                        ) : blacklist?.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4 bg-background/50 rounded-lg">
                            Kara listede numara yok
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {blacklist?.map((entry) => (
                              <div 
                                key={entry.id} 
                                className="flex items-center justify-between gap-2 p-3 bg-background/50 rounded-lg"
                                data-testid={`blacklist-entry-${entry.id}`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{entry.phone}</div>
                                  {entry.reason && (
                                    <div className="text-xs text-muted-foreground">{entry.reason}</div>
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeFromBlacklistMutation.mutate(entry.id)}
                                  disabled={removeFromBlacklistMutation.isPending}
                                  data-testid={`button-remove-blacklist-${entry.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-xs text-amber-800 dark:text-amber-300">
                            Kara listedeki numaralardan gelen mesajlar kaydedilir ancak bot otomatik yanıt vermez.
                          </p>
                        </div>
                      </div>

                      {/* Genel SSS - Şirket genelinde geçerli sık sorulan sorular */}
                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5" />
                            <Label className="text-base font-medium">Genel SSS (Sık Sorulan Sorular)</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Tüm aktiviteler için geçerli genel sorular. Bot, aktivite SSS'inde cevap bulamazsa bu listeye bakar.
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <Input 
                            placeholder="Soru (örn: İptal politikası nedir?)"
                            value={newFaqQuestion}
                            onChange={(e) => setNewFaqQuestion(e.target.value)}
                            data-testid="input-general-faq-question"
                          />
                          <Textarea 
                            placeholder="Cevap"
                            value={newFaqAnswer}
                            onChange={(e) => setNewFaqAnswer(e.target.value)}
                            rows={3}
                            data-testid="input-general-faq-answer"
                          />
                          <Button 
                            onClick={async () => {
                              if (newFaqQuestion.trim() && newFaqAnswer.trim()) {
                                const updatedFaq = [...generalFaq, { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }];
                                setGeneralFaq(updatedFaq);
                                setNewFaqQuestion("");
                                setNewFaqAnswer("");
                                setIsSavingGeneralFaq(true);
                                try {
                                  await fetch("/api/settings/generalFaq", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ value: JSON.stringify(updatedFaq) })
                                  });
                                } finally {
                                  setIsSavingGeneralFaq(false);
                                }
                              }
                            }}
                            disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim() || isSavingGeneralFaq}
                            data-testid="button-add-general-faq"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            SSS Ekle
                          </Button>
                        </div>

                        {generalFaq.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4 bg-background/50 rounded-lg">
                            Henüz genel SSS eklenmemiş
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {generalFaq.map((faq, index) => (
                              <div 
                                key={index} 
                                className="p-3 bg-background/50 rounded-lg"
                                data-testid={`general-faq-entry-${index}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{faq.question}</div>
                                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{faq.answer}</div>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={async () => {
                                      const updatedFaq = generalFaq.filter((_, i) => i !== index);
                                      setGeneralFaq(updatedFaq);
                                      setIsSavingGeneralFaq(true);
                                      try {
                                        await fetch("/api/settings/generalFaq", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ value: JSON.stringify(updatedFaq) })
                                        });
                                      } finally {
                                        setIsSavingGeneralFaq(false);
                                      }
                                    }}
                                    disabled={isSavingGeneralFaq}
                                    data-testid={`button-remove-general-faq-${index}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-800 dark:text-blue-300">
                            Bu sorular tüm aktiviteler için geçerlidir. İptal politikası, ödeme yöntemleri, transfer bilgileri gibi genel konuları buraya ekleyebilirsiniz.
                          </p>
                        </div>
                      </div>

                      {/* Otomatik Yanıtlar - anahtar kelime eşleşmesiyle hızlı cevaplar */}
                      <AutoResponsesCard />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="support" className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerSupportEmail">Müşteri Destek E-posta Adresi</Label>
                    <Input 
                      id="customerSupportEmail"
                      type="email"
                      value={customerSupportEmail}
                      onChange={(e) => setCustomerSupportEmail(e.target.value)}
                      placeholder="destek@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Müşteri destek talebinin gelmesi gereken e-posta adresi. Bot çözemediği sorular için bu adrese bildirim gönderilecek.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="space-y-6 mt-4">
                  {/* WooCommerce Auto-Notification */}
                  <Card>
                    <CardHeader>
                      <CardTitle>WooCommerce Sipariş Bildirimi Şablonu</CardTitle>
                      <CardDescription>
                        WooCommerce siparişi geldiğinde müşteriye gönderilecek mesaj şablonu.
                        <span className="text-primary"> Bildirimi açmak/kapatmak için Bildirimler sekmesini kullanın.</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Bildirim Mesajı Şablonu</Label>
                        <Textarea
                          value={wooNotificationTemplate}
                          onChange={(e) => setWooNotificationTemplate(e.target.value)}
                          placeholder="Bildirim mesajı şablonu..."
                          className="min-h-[150px] font-mono text-sm"
                          data-testid="textarea-woo-notification-template"
                        />
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                        <p className="font-medium">Kullanılabilir Değişkenler:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}isim{'}'}</code> - Müşteri adı</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}siparis_no{'}'}</code> - Sipariş numarası</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}aktivite{'}'}</code> - Aktivite/tur adı</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}tarih{'}'}</code> - Rezervasyon tarihi</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}saat{'}'}</code> - Rezervasyon saati</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}takip_linki{'}'}</code> - Takip linki</div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleSaveWooNotification}
                        disabled={isSavingWooNotification}
                        data-testid="button-save-woo-notification"
                      >
                        {isSavingWooNotification ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Kaydet
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <RequestMessageTemplatesSection />
                  
                  <div className="border-t pt-6">
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">Toplu Bildirim Mesaj Şablonları</h4>
                        <p className="text-sm text-muted-foreground">Rezervasyon durumuna göre farklı mesaj şablonları tanımlayın</p>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                        <p className="font-medium">Kullanılabilir Değişkenler:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}isim{'}'}</code> - Müşteri adı</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}tarih{'}'}</code> - Rezervasyon tarihi</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}aktivite{'}'}</code> - Aktivite adı</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}saat{'}'}</code> - Rezervasyon saati</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">confirmed</Badge>
                            <Input
                              value={bulkLabelConfirmed}
                              onChange={(e) => setBulkLabelConfirmed(e.target.value)}
                              className="h-7 w-32 text-sm font-medium"
                              placeholder="Şablon adı"
                              data-testid="input-bulk-label-confirmed"
                            />
                            <span className="text-sm text-muted-foreground">Onaylanan rezervasyonlar için</span>
                          </div>
                          <Textarea 
                            value={bulkTemplateConfirmed}
                            onChange={(e) => setBulkTemplateConfirmed(e.target.value)}
                            placeholder="Onay mesajı şablonu..."
                            className="min-h-[100px]"
                            data-testid="input-bulk-template-confirmed"
                          />
                        </Card>

                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">pending</Badge>
                            <Input
                              value={bulkLabelPending}
                              onChange={(e) => setBulkLabelPending(e.target.value)}
                              className="h-7 w-32 text-sm font-medium"
                              placeholder="Şablon adı"
                              data-testid="input-bulk-label-pending"
                            />
                            <span className="text-sm text-muted-foreground">Değerlendirilen rezervasyonlar için</span>
                          </div>
                          <Textarea 
                            value={bulkTemplatePending}
                            onChange={(e) => setBulkTemplatePending(e.target.value)}
                            placeholder="Beklemede mesajı şablonu..."
                            className="min-h-[100px]"
                            data-testid="input-bulk-template-pending"
                          />
                        </Card>

                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">cancelled</Badge>
                            <Input
                              value={bulkLabelCancelled}
                              onChange={(e) => setBulkLabelCancelled(e.target.value)}
                              className="h-7 w-32 text-sm font-medium"
                              placeholder="Şablon adı"
                              data-testid="input-bulk-label-cancelled"
                            />
                            <span className="text-sm text-muted-foreground">İptal edilen rezervasyonlar için</span>
                          </div>
                          <Textarea 
                            value={bulkTemplateCancelled}
                            onChange={(e) => setBulkTemplateCancelled(e.target.value)}
                            placeholder="İptal mesajı şablonu..."
                            className="min-h-[100px]"
                            data-testid="input-bulk-template-cancelled"
                          />
                        </Card>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Tek rezervasyon seçildiğinde değişkenler otomatik doldurulur. Birden fazla seçildiğinde genel mesaj kullanılır.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bot-test" className="space-y-6 mt-4">
                  <BotTestSection />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          </TabsContent>

          {/* INTEGRATIONS TAB */}
          <TabsContent value="integrations" className="space-y-6">
            <WhatsAppProviderSelector />
            <TwilioCard />
            <MetaCloudCard />
            <WooCommerceCard />
            <EmailCard />
          </TabsContent>

          {/* HOLIDAYS TAB */}
          <TabsContent value="holidays" className="space-y-6">
            <HolidaysSection />
          </TabsContent>

          {/* DATA EXPORT TAB */}
          <TabsContent value="data" className="space-y-6">
            <DataExportSection />
          </TabsContent>

          {/* PARTNERS TAB */}
          <TabsContent value="partners" className="space-y-6">
            <PartnerAgencySection />
          </TabsContent>

        </Tabs>

        {/* Save Button at the end of content */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Değişikliklerinizi kaydetmeyi unutmayın
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving}
                  size="lg"
                  className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all ml-auto"
                  data-testid="button-save-all"
                >
                  {isSaving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tüm ayarları kaydet</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </main>
    </div>
  );
}

// Twilio Card Component
function TwilioCard() {
  const { toast } = useToast();
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);

  const { data: twilioSettings, isLoading, refetch } = useQuery<{
    twilioAccountSid: string;
    twilioWhatsappNumber: string;
    twilioConfigured: boolean;
    twilioWebhookUrl: string;
  }>({
    queryKey: ['/api/tenant-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/tenant-integrations');
      if (!res.ok) return { twilioAccountSid: '', twilioWhatsappNumber: '', twilioConfigured: false, twilioWebhookUrl: '' };
      return res.json();
    },
  });

  const webhookUrl = twilioSettings?.twilioWebhookUrl || (typeof window !== 'undefined' 
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook');

  const handleConnect = async () => {
    if (!accountSid || !authToken || !whatsappNumber) {
      toast({
        title: "Hata",
        description: "Tüm alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountSid, authToken, whatsappNumber }),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Twilio bağlantısı kuruldu",
        });
        setAccountSid("");
        setAuthToken("");
        setWhatsappNumber("");
        refetch();
      } else {
        const error = await response.json();
        toast({
          title: "Hata",
          description: error.error || "Bağlantı kurulamadı",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bağlantı kurulamadı",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/twilio', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Twilio bağlantısı kaldırıldı",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bağlantı kaldırılamadı",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Kopyalandı",
      description: "Webhook URL panoya kopyalandı",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twilio WhatsApp Entegrasyonu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span>Twilio WhatsApp Entegrasyonu</span>
          </div>
          {twilioSettings?.twilioConfigured ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
              <CheckCircle className="w-3 h-3" />
              Bağlı
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3" />
              Bağlı Değil
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          WhatsApp üzerinden müşterilerinizle iletişim kurmak için Twilio hesabınızı bağlayın
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {twilioSettings?.twilioConfigured ? (
          <>
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">WhatsApp Bağlantısı Aktif</p>
                  <p className="text-sm opacity-80">Numara: {twilioSettings.twilioWhatsappNumber}</p>
                  <p className="text-sm opacity-60">Account SID: {twilioSettings.twilioAccountSid.substring(0, 10)}...</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="bg-muted font-mono text-xs" data-testid="input-twilio-webhook-url" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={copyToClipboard} data-testid="button-copy-twilio-webhook">
                      Kopyala
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Webhook URL'i panoya kopyala</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu URL'i Twilio Console &gt; Messaging &gt; Try it out &gt; Send a WhatsApp message &gt; Sandbox settings'e ekleyin.
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  data-testid="button-disconnect-twilio"
                >
                  {isDisconnecting ? "Kaldırılıyor..." : "Bağlantıyı Kaldır"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Twilio bağlantısını kaldır</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twilio-account-sid">Account SID</Label>
                <Input
                  id="twilio-account-sid"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  data-testid="input-twilio-account-sid"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio-auth-token">Auth Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="twilio-auth-token"
                    type={showAuthToken ? "text" : "password"}
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    data-testid="input-twilio-auth-token"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                    data-testid="button-toggle-auth-token"
                  >
                    {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio-whatsapp-number">WhatsApp Numarası</Label>
                <Input
                  id="twilio-whatsapp-number"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+14155238886"
                  data-testid="input-twilio-whatsapp-number"
                />
                <p className="text-xs text-muted-foreground">
                  Twilio'dan aldığınız WhatsApp numarasını girin (örn: +14155238886)
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-900 dark:text-blue-200">
                <strong>Twilio hesabınız yok mu?</strong> <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="underline">Twilio'ya ücretsiz kaydolun</a> ve WhatsApp Sandbox'ı etkinleştirin.
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  data-testid="button-connect-twilio"
                >
                  {isConnecting ? "Bağlanıyor..." : "Twilio'ya Bağlan"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Twilio hesabına bağlan</TooltipContent>
            </Tooltip>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// WhatsApp Provider Selector Component
function WhatsAppProviderSelector() {
  const { toast } = useToast();
  const [isChanging, setIsChanging] = useState(false);
  
  const { data: integrationSettings, refetch } = useQuery<{
    twilioConfigured: boolean;
    metaConfigured: boolean;
    activeWhatsappProvider: string | null;
  }>({
    queryKey: ['/api/tenant-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/tenant-integrations');
      if (!res.ok) return { twilioConfigured: false, metaConfigured: false, activeWhatsappProvider: null };
      return res.json();
    },
  });

  const handleProviderChange = async (provider: string) => {
    setIsChanging(true);
    try {
      const response = await fetch('/api/tenant-integrations/whatsapp-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: `Aktif provider: ${provider === 'twilio' ? 'Twilio' : 'Meta Cloud API'}`,
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Provider değiştirilemedi",
        variant: "destructive",
      });
    } finally {
      setIsChanging(false);
    }
  };

  const twilioConfigured = integrationSettings?.twilioConfigured || false;
  const metaConfigured = integrationSettings?.metaConfigured || false;
  const activeProvider = integrationSettings?.activeWhatsappProvider || 'twilio';

  if (!twilioConfigured && !metaConfigured) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span>Aktif WhatsApp Provider</span>
        </CardTitle>
        <CardDescription>
          Mesaj göndermek için hangi WhatsApp servisini kullanacağınızı seçin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            variant={activeProvider === 'twilio' ? 'default' : 'outline'}
            onClick={() => handleProviderChange('twilio')}
            disabled={!twilioConfigured || isChanging}
            className="flex-1"
            data-testid="button-select-twilio"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Twilio
            {!twilioConfigured && <span className="ml-2 text-xs">(Yapılandırılmamış)</span>}
          </Button>
          <Button
            variant={activeProvider === 'meta' ? 'default' : 'outline'}
            onClick={() => handleProviderChange('meta')}
            disabled={!metaConfigured || isChanging}
            className="flex-1"
            data-testid="button-select-meta"
          >
            <Globe className="w-4 h-4 mr-2" />
            Meta Cloud API
            {!metaConfigured && <span className="ml-2 text-xs">(Yapılandırılmamış)</span>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Şu anda aktif: <strong>{activeProvider === 'twilio' ? 'Twilio' : 'Meta Cloud API'}</strong>
        </p>
      </CardContent>
    </Card>
  );
}

// Meta Cloud API Card Component
function MetaCloudCard() {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);

  const { data: metaSettings, isLoading, refetch } = useQuery<{
    metaPhoneNumberId: string;
    metaBusinessAccountId: string;
    metaConfigured: boolean;
    metaWebhookUrl: string;
  }>({
    queryKey: ['/api/tenant-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/tenant-integrations');
      if (!res.ok) return { metaPhoneNumberId: '', metaBusinessAccountId: '', metaConfigured: false, metaWebhookUrl: '' };
      return res.json();
    },
  });

  const webhookUrl = metaSettings?.metaWebhookUrl || (typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/meta`
    : '/api/webhooks/meta');

  const handleConnect = async () => {
    if (!accessToken || !phoneNumberId) {
      toast({
        title: "Hata",
        description: "Access Token ve Phone Number ID gerekli",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, phoneNumberId, businessAccountId }),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Meta Cloud API bağlantısı kuruldu",
        });
        setAccessToken("");
        setPhoneNumberId("");
        setBusinessAccountId("");
        refetch();
      } else {
        const error = await response.json();
        toast({
          title: "Hata",
          description: error.error || "Bağlantı kurulamadı",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bağlantı kurulamadı",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/meta', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Meta Cloud API bağlantısı kaldırıldı",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bağlantı kaldırılamadı",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Kopyalandı",
      description: `${label} panoya kopyalandı`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meta Cloud API (Facebook WhatsApp)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <span>Meta Cloud API (Facebook WhatsApp)</span>
          </div>
          {metaSettings?.metaConfigured ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
              <CheckCircle className="w-3 h-3" />
              Bağlı
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3" />
              Bağlı Değil
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Facebook'un resmi WhatsApp Business API'sini kullanarak müşterilerinizle iletişim kurun
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metaSettings?.metaConfigured ? (
          <>
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Meta Cloud API Bağlantısı Aktif</p>
                  <p className="text-sm opacity-80">Phone Number ID: {metaSettings.metaPhoneNumberId}</p>
                  {metaSettings.metaBusinessAccountId && (
                    <p className="text-sm opacity-60">Business Account ID: {metaSettings.metaBusinessAccountId}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={typeof window !== 'undefined' ? `${window.location.origin}${webhookUrl}` : webhookUrl} className="bg-muted font-mono text-xs" data-testid="input-meta-webhook-url" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}${webhookUrl}` : webhookUrl, 'Webhook URL')} data-testid="button-copy-meta-webhook">
                      Kopyala
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Webhook URL'i panoya kopyala</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu URL'i Meta for Developers &gt; App Dashboard &gt; WhatsApp &gt; Configuration &gt; Webhook settings'e ekleyin.
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  data-testid="button-disconnect-meta"
                >
                  {isDisconnecting ? "Kaldırılıyor..." : "Bağlantıyı Kaldır"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Meta Cloud API bağlantısını kaldır</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta-access-token">Access Token (Permanent)</Label>
                <div className="flex gap-2">
                  <Input
                    id="meta-access-token"
                    type={showAccessToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxx..."
                    data-testid="input-meta-access-token"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    data-testid="button-toggle-meta-token"
                  >
                    {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-phone-number-id">Phone Number ID</Label>
                <Input
                  id="meta-phone-number-id"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="1234567890123456"
                  data-testid="input-meta-phone-number-id"
                />
                <p className="text-xs text-muted-foreground">
                  Meta for Developers &gt; App Dashboard &gt; WhatsApp &gt; API Setup'tan alabilirsiniz
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-business-account-id">WhatsApp Business Account ID (Opsiyonel)</Label>
                <Input
                  id="meta-business-account-id"
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  placeholder="9876543210123456"
                  data-testid="input-meta-business-account-id"
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-900 dark:text-blue-200">
                <strong>Meta Business hesabınız yok mu?</strong> <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="underline">Meta for Developers</a>'a gidin ve WhatsApp Cloud API'yi aktifleştirin.
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  data-testid="button-connect-meta"
                >
                  {isConnecting ? "Bağlanıyor..." : "Meta Cloud API'ye Bağlan"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Meta Cloud API hesabına bağlan</TooltipContent>
            </Tooltip>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// WooCommerce Card Component
function WooCommerceCard() {
  const { toast } = useToast();
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { data: wooSettings, isLoading, refetch } = useQuery<{
    woocommerceStoreUrl: string;
    woocommerceConsumerKey: string;
    woocommerceConfigured: boolean;
  }>({
    queryKey: ['/api/tenant-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/tenant-integrations');
      if (!res.ok) return { woocommerceStoreUrl: '', woocommerceConsumerKey: '', woocommerceConfigured: false };
      return res.json();
    },
  });

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/woocommerce`
    : '/api/webhooks/woocommerce';

  const handleConnect = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({
        title: "Hata",
        description: "Tum alanlari doldurun",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/woocommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "WooCommerce baglantisi kuruldu",
        });
        setStoreUrl("");
        setConsumerKey("");
        setConsumerSecret("");
        refetch();
      } else {
        const data = await response.json();
        toast({
          title: "Hata",
          description: data.error || "Baglanti kurulamadi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Baglanti hatası",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/woocommerce', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "WooCommerce baglantisi kaldırıldı",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Baglanti kaldırilamadi",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Kopyalandı",
      description: "Webhook URL panoya kopyalandı",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WooCommerce Entegrasyonu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>WooCommerce Entegrasyonu</span>
          {wooSettings?.woocommerceConfigured ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
              <CheckCircle className="w-3 h-3" />
              Bağlı
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3" />
              Bağlı Degil
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {wooSettings?.woocommerceConfigured ? (
          <>
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">WooCommerce Baglantisi Aktif</p>
                  <p className="text-sm opacity-80">Magaza: {wooSettings.woocommerceStoreUrl}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="bg-muted" data-testid="input-webhook-url" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={copyToClipboard} data-testid="button-copy-webhook">
                      Kopyala
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Webhook URL'i panoya kopyala</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu URL'i WooCommerce ayarlarıniza ekleyin (WooCommerce &gt; Settings &gt; Advanced &gt; Webhooks).
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  data-testid="button-disconnect-woo"
                >
                  {isDisconnecting ? "Kaldıriliyor..." : "Baglantiyi Kaldır"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>WooCommerce bağlantısını kaldır</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="woo-store-url">Magaza URL</Label>
                <Input
                  id="woo-store-url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://magazaniz.com"
                  data-testid="input-woo-store-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-consumer-key">Consumer Key</Label>
                <Input
                  id="woo-consumer-key"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_xxxxxxxx"
                  data-testid="input-woo-consumer-key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-consumer-secret">Consumer Secret</Label>
                <Input
                  id="woo-consumer-secret"
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_xxxxxxxx"
                  data-testid="input-woo-consumer-secret"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              WooCommerce &gt; Settings &gt; Advanced &gt; REST API bölümünden API anahtarlarınızı oluşturabilirsiniz.
            </p>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  data-testid="button-connect-woo"
                >
                  {isConnecting ? "Baglaniyor..." : "WooCommerce'e Baglan"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>WooCommerce mağazasına bağlan</TooltipContent>
            </Tooltip>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Email Card Component (Multi-provider: Gmail, Outlook, Yandex, Custom SMTP)
function EmailCard() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'yandex' | 'custom'>('gmail');
  const [emailUser, setEmailUser] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { data: emailSettings, isLoading } = useQuery<{
    emailProvider: string | null;
    emailUser: string | null;
    emailFromName: string | null;
    emailConfigured: boolean;
    emailSmtpHost: string | null;
    emailSmtpPort: number | null;
  }>({
    queryKey: ['/api/tenant-integrations'],
  });

  const providerLabels: Record<string, string> = {
    gmail: 'Gmail',
    outlook: 'Outlook / Office 365',
    yandex: 'Yandex',
    custom: 'Özel SMTP'
  };

  const providerHints: Record<string, string> = {
    gmail: 'Gmail için uygulama şifresi kullanın (2FA aktifse). Google Hesabı → Güvenlik → Uygulama şifreleri',
    outlook: 'Microsoft hesap şifrenizi kullanın. 2FA aktifse uygulama şifresi gerekebilir.',
    yandex: 'Yandex için uygulama şifresi kullanın. Yandex Pasaport → Uygulama şifreleri',
    custom: 'Kendi SMTP sunucunuzun bilgilerini girin.'
  };

  const handleConnect = async () => {
    if (!emailUser || !emailPassword) {
      toast({ title: "Hata", description: "E-posta adresi ve şifre gerekli", variant: "destructive" });
      return;
    }
    if (provider === 'custom' && (!smtpHost || !smtpPort)) {
      toast({ title: "Hata", description: "Özel SMTP için sunucu adresi ve port gerekli", variant: "destructive" });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await apiRequest('POST', '/api/tenant-integrations/email', {
        provider,
        emailUser,
        emailPassword,
        emailFromName: emailFromName || emailUser,
        smtpHost: provider === 'custom' ? smtpHost : undefined,
        smtpPort: provider === 'custom' ? parseInt(smtpPort) : undefined,
        smtpSecure: provider === 'custom' ? smtpSecure : undefined,
      });

      toast({ title: "Başarılı", description: `${providerLabels[provider]} ayarları kaydedildi` });
      setEmailPassword("");
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-integrations'] });
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Ayarlar kaydedilemedi", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await apiRequest('POST', '/api/tenant-integrations/email/test', {});
      toast({ title: "Başarılı", description: "E-posta bağlantısı başarılı!" });
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Bağlantı testi başarısız", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await apiRequest('DELETE', '/api/tenant-integrations/email', {});
      toast({ title: "Başarılı", description: "E-posta bağlantısı kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-integrations'] });
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Bağlantı kaldırılamadı", variant: "destructive" });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            E-posta Entegrasyonu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = emailSettings?.emailConfigured;
  const currentProvider = emailSettings?.emailProvider;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            <span>E-posta Entegrasyonu</span>
          </div>
          {isConfigured ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
              <CheckCircle className="w-3 h-3" />
              Bağlı
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3" />
              Bağlı Değil
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Müşterilerinize e-posta göndermek için e-posta hesabınızı bağlayın
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured ? (
          <>
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">E-posta Bağlantısı Aktif</p>
                  <p className="text-sm opacity-80">Sağlayıcı: {providerLabels[currentProvider || 'gmail'] || currentProvider}</p>
                  <p className="text-sm opacity-60">E-posta: {emailSettings?.emailUser}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTest} disabled={isTesting} data-testid="button-test-email">
                {isTesting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Test Ediliyor...</> : "Bağlantıyı Test Et"}
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting} data-testid="button-disconnect-email">
                {isDisconnecting ? "Kaldırılıyor..." : "Bağlantıyı Kaldır"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>E-posta Sağlayıcısı</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
                  <SelectTrigger data-testid="select-email-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                    <SelectItem value="yandex">Yandex</SelectItem>
                    <SelectItem value="custom">Özel SMTP</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{providerHints[provider]}</p>
              </div>

              {provider === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Sunucu</Label>
                    <Input
                      id="smtp-host"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.sirket.com"
                      data-testid="input-smtp-host"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      data-testid="input-smtp-port"
                    />
                  </div>
                  <div className="col-span-2 flex items-center space-x-2">
                    <Switch
                      id="smtp-secure"
                      checked={smtpSecure}
                      onCheckedChange={setSmtpSecure}
                      data-testid="switch-smtp-secure"
                    />
                    <Label htmlFor="smtp-secure">SSL/TLS Kullan (Port 465 için aktif)</Label>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email-user">E-posta Adresi</Label>
                <Input
                  id="email-user"
                  type="email"
                  value={emailUser}
                  onChange={(e) => setEmailUser(e.target.value)}
                  placeholder="ornek@gmail.com"
                  data-testid="input-email-user"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-password">Şifre / Uygulama Şifresi</Label>
                <div className="flex gap-2">
                  <Input
                    id="email-password"
                    type={showPassword ? "text" : "password"}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    data-testid="input-email-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-from-name">Gönderici Adı (opsiyonel)</Label>
                <Input
                  id="email-from-name"
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                  placeholder="Acenta Adı"
                  data-testid="input-email-from-name"
                />
              </div>
            </div>

            <Button onClick={handleConnect} disabled={isConnecting} data-testid="button-connect-email">
              {isConnecting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Kaydediliyor...</> : "E-posta Bağla"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Auto Responses Card Component
type AutoResponse = {
  id: number;
  name: string;
  keywords: string;
  keywordsEn: string | null;
  response: string;
  responseEn: string | null;
  priority: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

function AutoResponsesCard() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AutoResponse | null>(null);
  const [formName, setFormName] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formKeywordsEn, setFormKeywordsEn] = useState("");
  const [formResponse, setFormResponse] = useState("");
  const [formResponseEn, setFormResponseEn] = useState("");
  const [formPriority, setFormPriority] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'tr' | 'en'>('tr');

  const { data: autoResponses = [], isLoading } = useQuery<AutoResponse[]>({
    queryKey: ['/api/auto-responses']
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; keywords: string; keywordsEn: string; response: string; responseEn: string; priority: number; isActive: boolean }) => 
      apiRequest('POST', '/api/auto-responses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-responses'] });
      resetForm();
      setDialogOpen(false);
      toast({ title: "Başarılı", description: "Otomatik yanıt eklendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Otomatik yanıt eklenemedi.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; keywords: string; keywordsEn: string; response: string; responseEn: string; priority: number; isActive: boolean } }) => 
      apiRequest('PATCH', `/api/auto-responses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-responses'] });
      resetForm();
      setDialogOpen(false);
      toast({ title: "Başarılı", description: "Otomatik yanıt güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Otomatik yanıt güncellenemedi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/auto-responses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-responses'] });
      toast({ title: "Başarılı", description: "Otomatik yanıt silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Otomatik yanıt silinemedi.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormName("");
    setFormKeywords("");
    setFormKeywordsEn("");
    setFormResponse("");
    setFormResponseEn("");
    setFormPriority(0);
    setFormIsActive(true);
    setEditingItem(null);
    setActiveTab('tr');
  };

  const handleOpenDialog = (item?: AutoResponse) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      try {
        const keywords = JSON.parse(item.keywords);
        setFormKeywords(Array.isArray(keywords) ? keywords.join(", ") : "");
      } catch {
        setFormKeywords("");
      }
      try {
        const keywordsEn = JSON.parse(item.keywordsEn || '[]');
        setFormKeywordsEn(Array.isArray(keywordsEn) ? keywordsEn.join(", ") : "");
      } catch {
        setFormKeywordsEn("");
      }
      setFormResponse(item.response);
      setFormResponseEn(item.responseEn || "");
      setFormPriority(item.priority || 0);
      setFormIsActive(item.isActive !== false);
    } else {
      resetForm();
    }
    setActiveTab('tr');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim() || !formKeywords.trim() || !formResponse.trim()) {
      toast({ title: "Hata", description: "Turkce alanlar zorunludur.", variant: "destructive" });
      return;
    }

    const keywordsArray = formKeywords.split(",").map(k => k.trim()).filter(k => k);
    if (keywordsArray.length === 0) {
      toast({ title: "Hata", description: "En az bir Turkce anahtar kelime girmelisiniz.", variant: "destructive" });
      return;
    }

    const keywordsEnArray = formKeywordsEn.split(",").map(k => k.trim()).filter(k => k);

    const data = {
      name: formName.trim(),
      keywords: JSON.stringify(keywordsArray),
      keywordsEn: JSON.stringify(keywordsEnArray),
      response: formResponse.trim(),
      responseEn: formResponseEn.trim(),
      priority: formPriority,
      isActive: formIsActive
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu otomatik yaniti silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Otomatik Yanitlar
        </CardTitle>
        <CardDescription>
          Anahtar kelime eşleşmesiyle hızlı yanıtlar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-auto-response">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kural Ekle
              </Button>
            </TooltipTrigger>
            <TooltipContent>Yeni otomatik yanıt kuralı ekle</TooltipContent>
          </Tooltip>
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Yükleniyor...</div>
        ) : autoResponses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            Henüz otomatik yanıt kuralı eklenmemiş.
          </div>
        ) : (
          <div className="space-y-3">
            {autoResponses.map((item) => {
              let keywords: string[] = [];
              let keywordsEn: string[] = [];
              try {
                keywords = JSON.parse(item.keywords);
              } catch {}
              try {
                keywordsEn = JSON.parse(item.keywordsEn || '[]');
              } catch {}
              
              return (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg space-y-2 ${item.isActive === false ? 'opacity-50' : ''}`}
                  data-testid={`auto-response-item-${item.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      {item.isActive === false && (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                      <Badge variant="outline">Oncelik: {item.priority || 0}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Kuralı düzenle</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Kuralı sil</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-muted-foreground">TR:</span>
                      {keywords.map((kw, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    {keywordsEn.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-xs text-muted-foreground">EN:</span>
                        {keywordsEn.map((kw, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.response}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        {dialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDialogOpen(false)}>
            <div className="bg-background border rounded-lg p-6 max-w-lg w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold">
                {editingItem ? "Otomatik Yaniti Düzenle" : "Yeni Otomatik Yanit"}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auto-name">Kural Adı</Label>
                  <Input
                    id="auto-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="orn: Fiyat Sorgusu"
                    data-testid="input-auto-name"
                  />
                </div>

                <div className="flex gap-1 border-b">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`rounded-none border-b-2 ${activeTab === 'tr' ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => setActiveTab('tr')}
                    data-testid="tab-tr"
                  >
                    Turkce
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`rounded-none border-b-2 ${activeTab === 'en' ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => setActiveTab('en')}
                    data-testid="tab-en"
                  >
                    English
                  </Button>
                </div>

                {activeTab === 'tr' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="auto-keywords">Turkce Anahtar Kelimeler (virgul ile ayirin)</Label>
                      <Input
                        id="auto-keywords"
                        value={formKeywords}
                        onChange={(e) => setFormKeywords(e.target.value)}
                        placeholder="fiyat, ücret, ne kadar, kac para"
                        data-testid="input-auto-keywords"
                      />
                      <p className="text-xs text-muted-foreground">
                        Turkce karakter farki gözetilmez (i/ı, o/ö, u/ü, s/ş, c/ç, g/ğ)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auto-response">Turkce Yanit</Label>
                      <Textarea
                        id="auto-response"
                        value={formResponse}
                        onChange={(e) => setFormResponse(e.target.value)}
                        placeholder="Merhaba! Fiyatlarimiz hakkinda bilgi almak için..."
                        rows={4}
                        data-testid="input-auto-response"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="auto-keywords-en">English Keywords (comma separated)</Label>
                      <Input
                        id="auto-keywords-en"
                        value={formKeywordsEn}
                        onChange={(e) => setFormKeywordsEn(e.target.value)}
                        placeholder="price, cost, how much"
                        data-testid="input-auto-keywords-en"
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional - leave empty if no English support needed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auto-response-en">English Response</Label>
                      <Textarea
                        id="auto-response-en"
                        value={formResponseEn}
                        onChange={(e) => setFormResponseEn(e.target.value)}
                        placeholder="Hello! For price information..."
                        rows={4}
                        data-testid="input-auto-response-en"
                      />
                      <p className="text-xs text-muted-foreground">
                        If empty, Turkish response will be used for English queries
                      </p>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auto-priority">Oncelik</Label>
                    <Input
                      id="auto-priority"
                      type="number"
                      value={formPriority}
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                      data-testid="input-auto-priority"
                    />
                    <p className="text-xs text-muted-foreground">
                      Yüksek deger = once kontrol edilir
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Durum</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={formIsActive}
                        onCheckedChange={setFormIsActive}
                        data-testid="switch-auto-active"
                      />
                      <span className="text-sm">{formIsActive ? "Aktif" : "Pasif"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                  İptal
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-auto"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === DATA EXPORT SECTION ===
function DataExportSection() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const { data: preview, isLoading: isLoadingPreview, refetch: refetchPreview } = useQuery<{
    summary: {
      activitiesCount: number;
      reservationsCount: number;
      agenciesCount: number;
      messagesCount: number;
      customersCount: number;
      autoResponsesCount: number;
      supportRequestsCount: number;
      holidaysCount: number;
      faqCount: number;
    };
    lastUpdated: string;
  }>({
    queryKey: ['/api/tenant-export/preview']
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const typesParam = selectedTypes.join(',');
      const response = await fetch(`/api/tenant-export?format=${exportFormat}&types=${typesParam}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const filename = exportFormat === 'csv' 
        ? `acenta_verileri_${new Date().toISOString().split('T')[0]}.csv`
        : `acenta_verileri_${new Date().toISOString().split('T')[0]}.json`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Başarılı", description: "Veriler indirildi" });
    } catch (error) {
      toast({ title: "Hata", description: "Veriler indirilemedi", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ title: "Hata", description: "Sadece JSON formatında yedek dosyaları desteklenmektedir", variant: "destructive" });
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.exportInfo) {
        toast({ title: "Hata", description: "Geçersiz yedek dosyası formatı", variant: "destructive" });
        return;
      }

      setImportData(data);
      setShowImportConfirm(true);
    } catch (error) {
      toast({ title: "Hata", description: "Dosya okunamadı veya geçersiz JSON formatı", variant: "destructive" });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!importData) return;
    
    setIsImporting(true);
    try {
      const response = await fetch('/api/tenant-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData, options: { mode: importMode } })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
      setShowImportConfirm(false);
      refetchPreview();
      toast({ title: "Başarılı", description: result.message });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Veriler içe aktarılamadı", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const dataTypes = [
    { id: 'all', label: 'Tüm Veriler' },
    { id: 'reservations', label: 'Rezervasyonlar' },
    { id: 'activities', label: 'Aktiviteler' },
    { id: 'customers', label: 'Müşteriler' },
    { id: 'agencies', label: 'Acentalar' },
    { id: 'messages', label: 'Mesajlar' },
    { id: 'autoResponses', label: 'Otomatik Yanıtlar' },
    { id: 'supportRequests', label: 'Destek Talepleri' },
    { id: 'holidays', label: 'Tatiller' },
    { id: 'faq', label: 'SSS' },
    { id: 'settings', label: 'Bot Ayarları' },
  ];

  const toggleType = (typeId: string) => {
    if (typeId === 'all') {
      setSelectedTypes(['all']);
    } else {
      const newTypes = selectedTypes.filter(t => t !== 'all');
      if (newTypes.includes(typeId)) {
        const updated = newTypes.filter(t => t !== typeId);
        setSelectedTypes(updated.length === 0 ? ['all'] : updated);
      } else {
        setSelectedTypes([...newTypes, typeId]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Veri Dışa Aktarma (Yedekleme)
          </CardTitle>
          <CardDescription>
            Acentanıza ait tüm verileri indirin. JSON formatında indirerek daha sonra geri yükleyebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Veri Özeti</h4>
            {isLoadingPreview ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : preview ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.activitiesCount}</div>
                  <div className="text-xs text-muted-foreground">Aktivite</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.reservationsCount}</div>
                  <div className="text-xs text-muted-foreground">Rezervasyon</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.customersCount}</div>
                  <div className="text-xs text-muted-foreground">Müşteri</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.agenciesCount}</div>
                  <div className="text-xs text-muted-foreground">Acenta</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.messagesCount}</div>
                  <div className="text-xs text-muted-foreground">Mesaj</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.autoResponsesCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Otomatik Yanıt</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.supportRequestsCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Destek Talebi</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.holidaysCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Tatil</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.faqCount || 0}</div>
                  <div className="text-xs text-muted-foreground">SSS</div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Veri özeti yüklenemedi</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Veri Türleri</Label>
              <div className="flex flex-wrap gap-2">
                {dataTypes.map(type => (
                  <Button
                    key={type.id}
                    variant={selectedTypes.includes(type.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleType(type.id)}
                    data-testid={`button-type-${type.id}`}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'csv' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                  data-testid="button-format-csv"
                >
                  CSV (Excel)
                </Button>
                <Button
                  variant={exportFormat === 'json' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat('json')}
                  data-testid="button-format-json"
                >
                  JSON (Yedekleme)
                </Button>
              </div>
              {exportFormat === 'json' && (
                <p className="text-xs text-muted-foreground mt-1">
                  JSON formatındaki yedekleri daha sonra sisteme geri yükleyebilirsiniz.
                </p>
              )}
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full sm:w-auto"
            data-testid="button-export-data"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Verileri İndir
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Veri İçe Aktarma (Geri Yükleme)
          </CardTitle>
          <CardDescription>
            Daha önce indirdiğiniz JSON formatındaki yedek dosyasını yükleyerek verilerinizi geri yükleyin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-import-file"
          />
          
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              JSON formatında yedek dosyası yükleyin
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-select-file"
            >
              Dosya Seç
            </Button>
          </div>

          {importResult && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                İçe Aktarma Tamamlandı
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                {importResult.message}
              </p>
              {importResult.details && (
                <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                  {Object.entries(importResult.details).map(([key, value]: [string, any]) => (
                    <p key={key}>
                      {key}: {value.imported} eklendi, {value.skipped} atlandı
                      {value.errors?.length > 0 && `, ${value.errors.length} hata`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Veri İçe Aktarma Onayı</DialogTitle>
            <CardDescription>
              Yedek dosyası başarıyla okundu. İçe aktarmak istediğiniz verileri onaylayın.
            </CardDescription>
          </DialogHeader>
          
          {importData && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p><strong>Yedek Tarihi:</strong> {new Date(importData.exportInfo.exportedAt).toLocaleString('tr-TR')}</p>
                <p className="mt-2"><strong>İçerik:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {importData.activities && <li>{importData.activities.length} aktivite</li>}
                  {importData.reservations && <li>{importData.reservations.length} rezervasyon</li>}
                  {importData.agencies && <li>{importData.agencies.length} acenta</li>}
                </ul>
              </div>

              <div>
                <Label className="mb-2 block">İçe Aktarma Modu</Label>
                <div className="flex gap-2">
                  <Button
                    variant={importMode === 'merge' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportMode('merge')}
                  >
                    Birleştir
                  </Button>
                  <Button
                    variant={importMode === 'replace' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportMode('replace')}
                  >
                    Değiştir
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {importMode === 'merge' 
                    ? "Mevcut veriler korunur, sadece yeni veriler eklenir."
                    : "Mevcut veriler üzerine yazılır."}
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowImportConfirm(false)}>
                  İptal
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      İçe Aktarılıyor...
                    </>
                  ) : (
                    "İçe Aktar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Yedekleme ve Geri Yükleme Hakkında</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                <li>Verilerinizi düzenli olarak JSON formatında yedeklemenizi öneririz</li>
                <li>Geri yükleme işlemi sadece aynı acentaya ait yedekleri kabul eder</li>
                <li>Birleştir modu mevcut verileri korur, Değiştir modu üzerine yazar</li>
                <li>Rezervasyonlar aktivite adlarına göre eşleştirilir</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// === HOLIDAYS SECTION ===
const HOLIDAY_TYPES = [
  { value: 'official', label: 'Resmi Tatil' },
  { value: 'religious', label: 'Dini Bayram' },
  { value: 'special', label: 'Özel Gun' },
];

const PRESET_HOLIDAYS_2026 = [
  { name: "Yılbaşı", startDate: "2026-01-01", endDate: "2026-01-01", type: "official", keywords: '["yılbaşı", "yeni yıl", "1 ocak"]' },
  { name: "23 Nisan Ulusal Egemenlik ve Cocuk Bayrami", startDate: "2026-04-23", endDate: "2026-04-23", type: "official", keywords: '["23 nisan", "cocuk bayrami"]' },
  { name: "1 Mayıs Emek ve Dayanisma Gunu", startDate: "2026-05-01", endDate: "2026-05-01", type: "official", keywords: '["1 mayıs", "isci bayrami"]' },
  { name: "19 Mayıs Ataturku Anma Genclik ve Spor Bayrami", startDate: "2026-05-19", endDate: "2026-05-19", type: "official", keywords: '["19 mayıs", "genclik bayrami"]' },
  { name: "15 Temmuz Demokrasi ve Milli Birlik Gunu", startDate: "2026-07-15", endDate: "2026-07-15", type: "official", keywords: '["15 temmuz"]' },
  { name: "30 Ağustos Zafer Bayrami", startDate: "2026-08-30", endDate: "2026-08-30", type: "official", keywords: '["30 ağustos", "zafer bayrami"]' },
  { name: "29 Ekim Cumhuriyet Bayrami", startDate: "2026-10-29", endDate: "2026-10-29", type: "official", keywords: '["29 ekim", "cumhuriyet bayrami"]' },
  { name: "Ramazan Bayrami 2026", startDate: "2026-03-20", endDate: "2026-03-22", type: "religious", keywords: '["ramazan bayrami", "seker bayrami"]' },
  { name: "Kurban Bayrami 2026", startDate: "2026-05-27", endDate: "2026-05-30", type: "religious", keywords: '["kurban bayrami", "bayram"]' },
];

function HolidaysSection() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formType, setFormType] = useState("official");
  const [formKeywords, setFormKeywords] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays']
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Başarılı", description: "Tatil eklendi." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => apiRequest('PATCH', `/api/holidays/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Başarılı", description: "Tatil güncellendi." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      toast({ title: "Başarılı", description: "Tatil silindi." });
    }
  });

  const resetForm = () => {
    setEditingHoliday(null);
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormType("official");
    setFormKeywords("");
    setFormNotes("");
    setFormIsActive(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormName(holiday.name);
    setFormStartDate(holiday.startDate);
    setFormEndDate(holiday.endDate);
    setFormType(holiday.type || "official");
    try {
      const kw = JSON.parse(holiday.keywords || '[]');
      setFormKeywords(Array.isArray(kw) ? kw.join(', ') : '');
    } catch { setFormKeywords(''); }
    setFormNotes(holiday.notes || '');
    setFormIsActive(holiday.isActive ?? true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formStartDate) {
      toast({ title: "Hata", description: "Tatil adı ve başlangıç tarihi zorunludur.", variant: "destructive" });
      return;
    }
    const keywordsArray = formKeywords.split(',').map(k => k.trim()).filter(k => k);
    const data = {
      name: formName,
      startDate: formStartDate,
      endDate: formEndDate || formStartDate,
      type: formType,
      keywords: JSON.stringify(keywordsArray),
      notes: formNotes,
      isActive: formIsActive
    };
    if (editingHoliday) {
      await updateMutation.mutateAsync({ id: editingHoliday.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleImportPresets = async () => {
    if (!confirm("2026 yılı için varsayılan tatilleri eklemek istiyor musunuz?")) return;
    let added = 0;
    for (const preset of PRESET_HOLIDAYS_2026) {
      try {
        await createMutation.mutateAsync({ ...preset, isActive: true, notes: '' });
        added++;
      } catch {}
    }
    toast({ title: "Başarılı", description: `${added} tatil eklendi.` });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarHeart className="h-5 w-5" />
            Tatil ve Bayram Yönetimi
          </CardTitle>
          <CardDescription>Resmi tatiller ve bayramları yönetin. Bot müsaitlik kontrolünde bu tarihleri dikkate alır.</CardDescription>
        </div>
        <div className="flex gap-2">
          {holidays.length === 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleImportPresets} data-testid="button-import-holidays">
                  2026 Tatillerini Ekle
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hazır tatil listesini içe aktar</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-holiday">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Tatil
              </Button>
            </TooltipTrigger>
            <TooltipContent>Yeni tatil ekle</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            Henüz tatil eklenmemiş. "2026 Tatillerini Ekle" butonuna tıklayarak başlayabilirsiniz.
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => {
              const typeLabel = HOLIDAY_TYPES.find(t => t.value === holiday.type)?.label || holiday.type;
              const isMultiDay = holiday.startDate !== holiday.endDate;
              return (
                <div key={holiday.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 gap-3" data-testid={`row-holiday-${holiday.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{holiday.name}</span>
                      <Badge variant="outline" className="shrink-0">{typeLabel}</Badge>
                      {!holiday.isActive && <Badge variant="secondary" className="shrink-0">Pasif</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {isMultiDay ? `${formatDate(holiday.startDate)} - ${formatDate(holiday.endDate)}` : formatDate(holiday.startDate)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(holiday)} data-testid={`button-edit-holiday-${holiday.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tatili düzenle</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(holiday.id)} data-testid={`button-delete-holiday-${holiday.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tatili sil</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Tatil Düzenle' : 'Yeni Tatil Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tatil Adı *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ornegin: Kurban Bayrami" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi *</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tatil Tipi</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anahtar Kelimeler</Label>
              <Input value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} placeholder="bayram, tatil, kurban (virgullerle ayirin)" />
              <p className="text-xs text-muted-foreground">Bot bu kelimeleri algiladiginda tatil bilgisi verir</p>
            </div>
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Opsiyonel notlar" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tatili kaydet</TooltipContent>
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// === REQUEST MESSAGE TEMPLATES SECTION ===
interface RequestMessageTemplate {
  id: number;
  name: string;
  templateType: string;
  messageContent: string;
  isDefault: boolean | null;
  isActive: boolean | null;
  createdAt: string | null;
}

function RequestMessageTemplatesSection() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: templates, refetch } = useQuery<RequestMessageTemplate[]>({
    queryKey: ['/api/request-message-templates'],
  });

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiRequest('DELETE', `/api/request-message-templates/${id}`);
      toast({ title: "Başarılı", description: "Şablon silindi." });
      refetch();
    } catch (err) {
      toast({ title: "Hata", description: "Şablon silinemedi.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (template: RequestMessageTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditType(template.templateType);
    setEditContent(template.messageContent);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      await apiRequest('PATCH', `/api/request-message-templates/${editingId}`, {
        name: editName,
        templateType: editType,
        messageContent: editContent
      });
      toast({ title: "Başarılı", description: "Şablon güncellendi." });
      setEditingId(null);
      refetch();
    } catch (err) {
      toast({ title: "Hata", description: "Şablon güncellenemedi.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditType("");
    setEditContent("");
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'approved': return 'Onaylandı';
      case 'pending': return 'Değerlendiriliyor';
      case 'rejected': return 'Reddedildi';
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="font-medium">Talep Mesaj Şablonları</h4>
        <p className="text-sm text-muted-foreground">
          Müşteri taleplerine yanıt verirken kullanılacak hazır mesaj şablonları
        </p>
      </div>

      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
        <p className="font-medium">Kullanılabilir Değişkenler:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}müşteri_adi{'}'}</code> - Müşteri adı</div>
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}talep_turu{'}'}</code> - Talep türü</div>
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}yeni_saat{'}'}</code> - Yeni saat (saat değişikliği için)</div>
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}red_sebebi{'}'}</code> - Ret sebebi</div>
        </div>
      </div>

      <div className="space-y-3">
        {templates?.map((template) => (
          <Card key={template.id} className="p-4">
            {editingId === template.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Şablon Adı</Label>
                    <Input 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Şablon adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Şablon Tipi</Label>
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Onaylandı</SelectItem>
                        <SelectItem value="pending">Değerlendiriliyor</SelectItem>
                        <SelectItem value="rejected">Reddedildi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mesaj İçeriği</Label>
                  <Textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Mesaj içeriği..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    İptal
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    <Badge className={getTypeBadgeClass(template.templateType)}>
                      {getTypeLabel(template.templateType)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Şablonu Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{template.name}" şablonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(template.id)}
                            disabled={deletingId === template.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === template.id ? "Siliniyor..." : "Sil"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                  {template.messageContent}
                </pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// === BOT TEST SECTION ===
function BotTestSection() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("+90532");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!phone || !message.trim()) {
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
          Body: message,
        }),
      });

      if (!res.ok) throw new Error("Bot yanit veremedi");

      const responseText = await res.text();
      
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Chat Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Chat Messages */}
        <div className="border rounded-lg p-4 h-64 overflow-y-auto space-y-3 bg-muted/30">
          {history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground">
              <div>
                <p className="text-sm font-semibold mb-1">Henüz mesaj yok</p>
                <p className="text-xs">Botu test etmek için aşağıda bir mesaj yazın</p>
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
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="test-phone" className="text-xs">Telefon</Label>
              <Input
                id="test-phone"
                placeholder="+905321234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-sm"
                data-testid="input-bot-test-phone"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSend}
                disabled={loading}
                className="w-full"
                data-testid="button-bot-test-send"
              >
                {loading ? "Gönderiliyor..." : "Gönder"}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="test-message" className="text-xs">Mesaj</Label>
            <Textarea
              id="test-message"
              placeholder="Botunuza göndermek istediğiniz mesajı yazın..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleSend();
                }
              }}
              className="h-16 text-sm"
              data-testid="input-bot-test-message"
            />
          </div>
        </div>
      </div>

      {/* Bot Info */}
      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Bot Bilgisi
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <Badge variant="secondary" className="text-xs">Gemini 1.5 Flash</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dil</span>
              <span className="font-medium">Türkçe / English</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Durum</span>
              <span className="flex items-center gap-1 font-medium text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Aktif
              </span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 text-xs mb-2">Ipuclari</h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>Turkce olarak sorular sorun</li>
            <li>Bot aktiviteleri ve kapasiteyi gorebilir</li>
            <li>Rezervasyon yapabilir</li>
            <li>Ctrl+Enter ile hızlı gönder</li>
          </ul>
        </div>

        {history.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => setHistory([])}
            data-testid="button-clear-chat"
          >
            Sohbeti Temizle
          </Button>
        )}
      </div>
    </div>
  );
}

// === USER MANAGEMENT SECTION ===
interface TenantUser {
  id: number;
  tenantId: number | null;
  username: string;
  email: string;
  name: string | null;
  phone: string | null;
  isActive: boolean;
  roles?: { roleId: number; role?: { name: string } }[];
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  color?: string;
}

interface ViewerActivityShare {
  id: number;
  tenantId: number;
  viewerUserId: number;
  activityId: number;
  isShared: boolean;
  viewerUnitPriceTry: string | null;
  viewerUnitPriceUsd: string | null;
  viewerUnitPriceEur: string | null;
}

interface Activity {
  id: number;
  name: string;
  unitPrice: string | null;
}

function UserManagementSection() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [viewerSharesUser, setViewerSharesUser] = useState<TenantUser | null>(null);
  const [viewerShares, setViewerShares] = useState<Array<{
    activityId: number;
    isShared: boolean;
    viewerUnitPriceTry: string;
    viewerUnitPriceUsd: string;
    viewerUnitPriceEur: string;
  }>>([]);
  const [isSavingShares, setIsSavingShares] = useState(false);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    phone: "",
    roleIds: [] as number[],
  });

  // Get current user id from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      } catch {
        setCurrentUserId(null);
      }
    }
  }, []);

  // SECURITY: We use the session tenant ID on the server, not client-provided values
  const { data: users = [], isLoading, refetch } = useQuery<TenantUser[]>({
    queryKey: ['/api/tenant-users'],
  });

  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  // Load viewer shares when dialog opens
  const loadViewerShares = async (user: TenantUser) => {
    try {
      const res = await fetch(`/api/viewer-activity-shares/${user.id}`);
      const existingShares: ViewerActivityShare[] = await res.json();
      
      // Initialize shares for all activities
      const sharesMap = new Map(existingShares.map(s => [s.activityId, s]));
      const allShares = activities.map(activity => {
        const existing = sharesMap.get(activity.id);
        return {
          activityId: activity.id,
          isShared: existing?.isShared ?? true,
          viewerUnitPriceTry: existing?.viewerUnitPriceTry || "",
          viewerUnitPriceUsd: existing?.viewerUnitPriceUsd || "",
          viewerUnitPriceEur: existing?.viewerUnitPriceEur || "",
        };
      });
      
      setViewerShares(allShares);
      setViewerSharesUser(user);
    } catch (error) {
      console.error("Failed to load viewer shares:", error);
      toast({ title: "Hata", description: "Aktivite paylaşımları yüklenemedi", variant: "destructive" });
    }
  };

  const saveViewerShares = async () => {
    if (!viewerSharesUser) return;
    
    setIsSavingShares(true);
    try {
      await apiRequest('PUT', `/api/viewer-activity-shares/${viewerSharesUser.id}`, {
        shares: viewerShares.map(s => ({
          activityId: s.activityId,
          isShared: s.isShared,
          viewerUnitPriceTry: s.viewerUnitPriceTry ? parseFloat(s.viewerUnitPriceTry) : undefined,
          viewerUnitPriceUsd: s.viewerUnitPriceUsd ? parseFloat(s.viewerUnitPriceUsd) : undefined,
          viewerUnitPriceEur: s.viewerUnitPriceEur ? parseFloat(s.viewerUnitPriceEur) : undefined,
        }))
      });
      toast({ title: "Başarılı", description: "Aktivite paylaşımları kaydedildi" });
      setViewerSharesUser(null);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Kaydedilemedi", variant: "destructive" });
    } finally {
      setIsSavingShares(false);
    }
  };

  const isViewerUser = (user: TenantUser) => {
    const viewerRole = allRoles.find(r => r.name === 'viewer');
    if (!viewerRole) return false;
    return user.roles?.some(r => r.roleId === viewerRole.id);
  };

  // Filter to only show tenant-specific roles (Manager, Operator, Viewer)
  // Owner role is only assigned automatically when tenant is created
  // Viewer role is for partner agencies with limited access
  const tenantRoles = allRoles.filter(r => 
    r.name === 'tenant_manager' || r.name === 'tenant_operator' || r.name === 'viewer'
  );

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userForm) => {
      const res = await apiRequest('POST', '/api/tenant-users', data);
      return res;
    },
    onSuccess: () => {
      refetch();
      setEditingUser(null);
      setIsNewUser(false);
      toast({ title: "Başarılı", description: "Kullanıcı oluşturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kullanıcı oluşturulamadi", variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof userForm> }) => {
      const res = await apiRequest('PATCH', `/api/tenant-users/${id}`, data);
      return res;
    },
    onSuccess: () => {
      refetch();
      setEditingUser(null);
      toast({ title: "Başarılı", description: "Kullanıcı güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kullanıcı güncellenemedi", variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/tenant-users/${id}`),
    onSuccess: () => {
      refetch();
      toast({ title: "Başarılı", description: "Kullanıcı silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kullanıcı silinemedi", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setUserForm({
      username: "",
      email: "",
      password: "",
      name: "",
      phone: "",
      roleIds: [],
    });
  };

  const openNewUserDialog = () => {
    resetForm();
    setIsNewUser(true);
    setEditingUser({ id: 0 } as TenantUser);
  };

  const openEditUserDialog = (user: TenantUser) => {
    setUserForm({
      username: user.username,
      email: user.email,
      password: "",
      name: user.name || "",
      phone: user.phone || "",
      roleIds: user.roles?.map(r => r.roleId) || [],
    });
    setIsNewUser(false);
    setEditingUser(user);
  };

  const handleSaveUser = () => {
    if (isNewUser) {
      createUserMutation.mutate({ ...userForm });
    } else if (editingUser?.id) {
      const updateData: any = { ...userForm };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateUserMutation.mutate({ id: editingUser.id, data: updateData });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kullanıcı Yönetimi
          </CardTitle>
          <CardDescription>
            Acentaniz için kullanıcı hesaplarini yonetin
          </CardDescription>
        </div>
        <Button onClick={openNewUserDialog} data-testid="button-new-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henuz kullanıcı bulunmuyor. Yeni kullanıcı eklemek için butona tıklayın.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                data-testid={`user-row-${user.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{user.name || user.username}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => loadViewerShares(user)}
                        data-testid={`button-viewer-shares-${user.id}`}
                      >
                        <Settings2 className="h-4 w-4 text-blue-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Aktivite Erişimi ve Fiyatları</TooltipContent>
                  </Tooltip>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditUserDialog(user)}
                    data-testid={`button-edit-user-${user.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {user.id !== currentUserId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`"${user.name || user.username}" kullanıcısini silmek istediğinizden emin misiniz?`)) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isNewUser ? "Yeni Kullanıcı Ekle" : "Kullanıcı Düzenle"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı *</Label>
                <Input
                  id="username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="Kullanıcı adi"
                  disabled={!isNewUser}
                  data-testid="input-user-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="ornek@email.com"
                  data-testid="input-user-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ad Soyad"
                  data-testid="input-user-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+90 5XX XXX XX XX"
                  data-testid="input-user-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{isNewUser ? "Şifre *" : "Yeni Şifre (boş birakilabilir)"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={isNewUser ? "Şifre girin" : "Değiştirmek için yeni şifre"}
                  data-testid="input-user-password"
                />
              </div>

              {tenantRoles.length > 0 && (
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <p className="text-xs text-muted-foreground">
                    Yönetiçi: Aktivite, bot, finans ve kullanıcı yönetimi. Operator: Rezervasyon ve mesajlar.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tenantRoles.map((role) => (
                      <Badge
                        key={role.id}
                        variant={userForm.roleIds.includes(role.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (userForm.roleIds.includes(role.id)) {
                            setUserForm({ ...userForm, roleIds: userForm.roleIds.filter(id => id !== role.id) });
                          } else {
                            setUserForm({ ...userForm, roleIds: [...userForm.roleIds, role.id] });
                          }
                        }}
                        data-testid={`badge-role-${role.id}`}
                      >
                        {role.displayName || role.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                İptal
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={
                  !userForm.username || !userForm.email ||
                  (isNewUser && !userForm.password) ||
                  createUserMutation.isPending || updateUserMutation.isPending
                }
                data-testid="button-save-user"
              >
                {(createUserMutation.isPending || updateUserMutation.isPending) ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Viewer Activity Shares Dialog */}
        <Dialog open={!!viewerSharesUser} onOpenChange={(open) => !open && setViewerSharesUser(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Aktivite Erişimi - {viewerSharesUser?.name || viewerSharesUser?.username}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Bu kullanıcının görebileceği aktiviteleri ve özel fiyatlarını belirleyin.
              </p>

              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz aktivite bulunmuyor.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const share = viewerShares.find(s => s.activityId === activity.id);
                    if (!share) return null;
                    
                    return (
                      <div key={activity.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{activity.name}</div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`share-${activity.id}`} className="text-sm">Paylaş</Label>
                            <Switch
                              id={`share-${activity.id}`}
                              checked={share.isShared}
                              onCheckedChange={(checked) => {
                                setViewerShares(prev => prev.map(s => 
                                  s.activityId === activity.id ? { ...s, isShared: checked } : s
                                ));
                              }}
                              data-testid={`switch-share-${activity.id}`}
                            />
                          </div>
                        </div>

                        {share.isShared && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Fiyat (TRY)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={activity.unitPrice || "Varsayılan"}
                                value={share.viewerUnitPriceTry}
                                onChange={(e) => {
                                  setViewerShares(prev => prev.map(s => 
                                    s.activityId === activity.id ? { ...s, viewerUnitPriceTry: e.target.value } : s
                                  ));
                                }}
                                data-testid={`input-price-try-${activity.id}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fiyat (USD)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="USD"
                                value={share.viewerUnitPriceUsd}
                                onChange={(e) => {
                                  setViewerShares(prev => prev.map(s => 
                                    s.activityId === activity.id ? { ...s, viewerUnitPriceUsd: e.target.value } : s
                                  ));
                                }}
                                data-testid={`input-price-usd-${activity.id}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fiyat (EUR)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="EUR"
                                value={share.viewerUnitPriceEur}
                                onChange={(e) => {
                                  setViewerShares(prev => prev.map(s => 
                                    s.activityId === activity.id ? { ...s, viewerUnitPriceEur: e.target.value } : s
                                  ));
                                }}
                                data-testid={`input-price-eur-${activity.id}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewerSharesUser(null)}>
                İptal
              </Button>
              <Button
                onClick={saveViewerShares}
                disabled={isSavingShares}
                data-testid="button-save-viewer-shares"
              >
                {isSavingShares ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Partner Agency Section Component
function PartnerAgencySection() {
  const { toast } = useToast();
  const [connectCode, setConnectCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch my invite codes
  const { data: inviteCodes, isLoading: isLoadingCodes, refetch: refetchCodes } = useQuery<{
    id: number;
    tenantId: number;
    code: string;
    isActive: boolean;
    usageCount: number;
    maxUsage: number | null;
    expiresAt: string | null;
    createdAt: string;
  }[]>({
    queryKey: ['/api/partner-invite-codes'],
  });

  // Fetch my partnerships
  const { data: partnerships, isLoading: isLoadingPartnerships, refetch: refetchPartnerships } = useQuery<{
    id: number;
    requesterTenantId: number;
    partnerTenantId: number;
    inviteCode: string;
    status: string;
    requestedAt: string;
    respondedAt: string | null;
    notes: string | null;
    requesterTenantName: string;
    partnerTenantName: string;
    isRequester: boolean;
  }[]>({
    queryKey: ['/api/tenant-partnerships'],
  });

  // Generate new invite code
  const generateCodeMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/partner-invite-codes', {}),
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Yeni davet kodu oluşturuldu" });
      refetchCodes();
    },
    onError: () => {
      toast({ title: "Hata", description: "Davet kodu oluşturulamadı", variant: "destructive" });
    },
  });

  // Delete invite code
  const deleteCodeMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/partner-invite-codes/${id}`),
    onSuccess: () => {
      toast({ title: "Basarili", description: "Davet kodu silindi" });
      refetchCodes();
    },
    onError: () => {
      toast({ title: "Hata", description: "Davet kodu silinemedi", variant: "destructive" });
    },
  });

  // Connect to partner
  const handleConnect = async () => {
    if (!connectCode.trim()) {
      toast({ title: "Hata", description: "Davet kodu girin", variant: "destructive" });
      return;
    }
    
    setIsConnecting(true);
    try {
      await apiRequest('POST', '/api/tenant-partnerships/connect', { code: connectCode.trim().toUpperCase() });
      toast({ title: "Başarılı", description: "Bağlantı talebi gönderildi. Partner onayladığında aktif olacak." });
      setConnectCode("");
      refetchPartnerships();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Bağlantı kurulamadı", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  // Respond to partnership request
  const respondMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'accept' | 'reject' }) => 
      apiRequest('PATCH', `/api/tenant-partnerships/${id}/respond`, { action }),
    onSuccess: (_, { action }) => {
      toast({ title: "Başarılı", description: action === 'accept' ? "Bağlantı kabul edildi" : "Bağlantı reddedildi" });
      refetchPartnerships();
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem yapılamadı", variant: "destructive" });
    },
  });

  const pendingRequests = partnerships?.filter(p => p.status === 'pending' && !p.isRequester) || [];
  const activePartnerships = partnerships?.filter(p => p.status === 'active') || [];
  const sentRequests = partnerships?.filter(p => p.status === 'pending' && p.isRequester) || [];

  return (
    <>
      {/* My Invite Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Partner Davet Kodlarim
          </CardTitle>
          <CardDescription>
            Diğer acentaların size bağlanabilmesi için davet kodu oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => generateCodeMutation.mutate()}
            disabled={generateCodeMutation.isPending}
            data-testid="button-generate-partner-code"
          >
            <Plus className="w-4 h-4 mr-2" />
            {generateCodeMutation.isPending ? "Oluşturuluyor..." : "Yeni Kod Oluştur"}
          </Button>

          {isLoadingCodes ? (
            <Skeleton className="h-20 w-full" />
          ) : inviteCodes && inviteCodes.length > 0 ? (
            <div className="space-y-2">
              {inviteCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  data-testid={`invite-code-${code.id}`}
                >
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold text-primary">{code.code}</code>
                    <Badge variant={code.isActive ? "default" : "secondary"}>
                      {code.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {code.usageCount} kez kullanıldı
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteCodeMutation.mutate(code.id)}
                    disabled={deleteCodeMutation.isPending}
                    data-testid={`button-delete-code-${code.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz davet kodu oluşturmadınız</p>
          )}
        </CardContent>
      </Card>

      {/* Connect to Partner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Partner Acentaya Bağlan
          </CardTitle>
          <CardDescription>
            Başka bir acentanın davet kodunu girerek bağlanın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={connectCode}
              onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
              placeholder="Davet kodu (ornek: ABC123)"
              className="font-mono"
              maxLength={10}
              data-testid="input-partner-code"
            />
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !connectCode.trim()}
              data-testid="button-connect-partner"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Bağlan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests (Incoming) */}
      {pendingRequests.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Bekleyen Bağlantı Talepleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 bg-warning/10 rounded-md"
                data-testid={`pending-request-${req.id}`}
              >
                <div>
                  <p className="font-medium">{req.requesterTenantName}</p>
                  <p className="text-sm text-muted-foreground">
                    bağlanmak istiyor
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respondMutation.mutate({ id: req.id, action: 'accept' })}
                    disabled={respondMutation.isPending}
                    data-testid={`button-accept-${req.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Kabul Et
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => respondMutation.mutate({ id: req.id, action: 'reject' })}
                    disabled={respondMutation.isPending}
                    data-testid={`button-reject-${req.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reddet
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Partnerships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Aktif Partner Acentalar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPartnerships ? (
            <Skeleton className="h-20 w-full" />
          ) : activePartnerships.length > 0 ? (
            <div className="space-y-2">
              {activePartnerships.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  data-testid={`partnership-${p.id}`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">
                        {p.isRequester ? p.partnerTenantName : p.requesterTenantName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {p.isRequester ? "Siz bağlantı istediniz" : "Size bağlandı"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Aktif</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz aktif partner acentanız yok</p>
          )}

          {/* Sent Requests (Waiting for approval) */}
          {sentRequests.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Gönderilen Talepler (Onay Bekliyor)</p>
              {sentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                  data-testid={`sent-request-${req.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <p>{req.partnerTenantName}</p>
                  </div>
                  <Badge variant="secondary">Onay Bekliyor</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

const TENANT_NOTIFICATION_TYPES = [
  { type: 'reservation_new', label: 'Yeni Rezervasyon (Manuel)', description: 'Personel tarafından manuel olarak oluşturulan rezervasyonlarda müşteriye onay bildirimi gönderilir', templateTab: 'whatsapp', templateLabel: 'Şablonu Düzenle' },
  { type: 'reservation_confirmed', label: 'Rezervasyon Onayı', description: 'Bekleyen bir rezervasyon onaylandığında müşteriye bildirim gönderilir' },
  { type: 'reservation_cancelled', label: 'Rezervasyon İptali', description: 'Bir rezervasyon iptal edildiğinde müşteriye bildirim gönderilir' },
  { type: 'customer_request', label: 'Müşteri Talebi Yanıtı', description: 'Müşterinin değişiklik veya iptal talebi işlendiğinde (onay/red) müşteriye bildirim gönderilir', templateTab: 'whatsapp', templateSubTab: 'templates', templateLabel: 'Şablonu Düzenle' },
  { type: 'woocommerce_order', label: 'WooCommerce Siparişi', description: 'WooCommerce web sitesinden gelen siparişlerde müşteriye otomatik onay bildirimi gönderilir', templateTab: 'whatsapp', templateSubTab: 'templates', templateLabel: 'Şablonu Düzenle' },
];

const USER_NOTIFICATION_TYPES = [
  { type: 'reservation_new', label: 'Yeni Rezervasyon', description: 'Yeni rezervasyon oluşturulduğunda' },
  { type: 'customer_request', label: 'Müşteri Talebi', description: 'Müşteri değişiklik/iptal talebi gönderdiğinde' },
  { type: 'partner_request', label: 'Partner Talebi', description: 'Partner acentadan rezervasyon talebi geldiğinde' },
  { type: 'partner_request_approved', label: 'Partner Talebi Onaylandı', description: 'Gönderdiğiniz partner talebi onaylandığında' },
  { type: 'partner_request_rejected', label: 'Partner Talebi Reddedildi', description: 'Gönderdiğiniz partner talebi reddedildiğinde' },
  { type: 'capacity_warning', label: 'Kapasite Uyarısı', description: 'Aktivite kapasitesi azaldığında' },
  { type: 'woocommerce_order', label: 'WooCommerce Siparişi', description: 'WooCommerce siparişi geldiğinde' },
];

function NotificationPreferencesTab({ onNavigateToTemplate }: { onNavigateToTemplate?: (tab: string, subTab?: string) => void }) {
  const { toast } = useToast();
  const [savingTenantType, setSavingTenantType] = useState<string | null>(null);
  const [savingUserType, setSavingUserType] = useState<string | null>(null);

  const { data: tenantSettings = [], isLoading: isLoadingTenant } = useQuery<any[]>({
    queryKey: ['/api/tenant-notification-settings'],
  });

  const { data: userPrefs = [], isLoading: isLoadingUser } = useQuery<any[]>({
    queryKey: ['/api/user-notification-preferences'],
  });

  const saveTenantMutation = useMutation({
    mutationFn: async (data: { notificationType: string; channels: string[]; enabled: boolean }) => {
      return apiRequest('POST', '/api/tenant-notification-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-notification-settings'] });
      toast({ title: 'Bildirim ayarı kaydedildi' });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Bildirim ayarı kaydedilemedi', variant: 'destructive' });
    },
    onSettled: () => {
      setSavingTenantType(null);
    },
  });

  const saveUserMutation = useMutation({
    mutationFn: async (data: { notificationType: string; channels: string[]; enabled: boolean }) => {
      return apiRequest('POST', '/api/user-notification-preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-notification-preferences'] });
      toast({ title: 'Bildirim tercihiniz kaydedildi' });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Bildirim tercihi kaydedilemedi', variant: 'destructive' });
    },
    onSettled: () => {
      setSavingUserType(null);
    },
  });

  const getTenantSettingForType = (type: string) => {
    return tenantSettings.find((s: any) => s.notificationType === type);
  };

  const getUserPrefForType = (type: string) => {
    return userPrefs.find((p: any) => p.notificationType === type);
  };

  const handleTenantToggleChannel = (notificationType: string, channel: string, currentChannels: string[]) => {
    setSavingTenantType(notificationType);
    let newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    
    const existing = getTenantSettingForType(notificationType);
    saveTenantMutation.mutate({
      notificationType,
      channels: newChannels,
      enabled: existing?.enabled ?? true,
    });
  };

  const handleTenantToggleEnabled = (notificationType: string, enabled: boolean) => {
    setSavingTenantType(notificationType);
    const existing = getTenantSettingForType(notificationType);
    const channels: string[] = existing?.channels ?? ['whatsapp'];
    
    saveTenantMutation.mutate({
      notificationType,
      channels,
      enabled,
    });
  };

  const handleUserToggleChannel = (notificationType: string, channel: string, currentChannels: string[]) => {
    setSavingUserType(notificationType);
    let newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    
    const existing = getUserPrefForType(notificationType);
    saveUserMutation.mutate({
      notificationType,
      channels: newChannels,
      enabled: existing?.enabled ?? true,
    });
  };

  const handleUserToggleEnabled = (notificationType: string, enabled: boolean) => {
    setSavingUserType(notificationType);
    const existing = getUserPrefForType(notificationType);
    const channels: string[] = existing?.channels ?? ['app'];
    
    saveUserMutation.mutate({
      notificationType,
      channels,
      enabled,
    });
  };

  if (isLoadingTenant || isLoadingUser) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Müşteri Bildirim Ayarları
          </CardTitle>
          <CardDescription>
            Müşterilerinize gönderilecek bildirimlerin kanal ve ayarlarını belirleyin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TENANT_NOTIFICATION_TYPES.map((notif) => {
            const setting = getTenantSettingForType(notif.type);
            const enabled = setting?.enabled ?? true;
            const channels: string[] = setting?.channels ?? ['whatsapp'];
            const isSaving = savingTenantType === notif.type;

            return (
              <div
                key={notif.type}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg gap-4"
                data-testid={`tenant-notification-${notif.type}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleTenantToggleEnabled(notif.type, checked)}
                      disabled={isSaving}
                      data-testid={`switch-tenant-${notif.type}`}
                    />
                    <span className="font-medium">{notif.label}</span>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-11">{notif.description}</p>
                </div>

                {enabled && (
                  <div className="flex items-center gap-2 ml-11 sm:ml-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={channels.includes('whatsapp') ? 'default' : 'outline'}
                          className="gap-1"
                          onClick={() => handleTenantToggleChannel(notif.type, 'whatsapp', channels)}
                          disabled={isSaving}
                          data-testid={`btn-tenant-whatsapp-${notif.type}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>WhatsApp ile bildirim gönder</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={channels.includes('email') ? 'default' : 'outline'}
                          className="gap-1"
                          onClick={() => handleTenantToggleChannel(notif.type, 'email', channels)}
                          disabled={isSaving}
                          data-testid={`btn-tenant-email-${notif.type}`}
                        >
                          <Mail className="h-4 w-4" />
                          E-posta
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>E-posta ile bildirim gönder</TooltipContent>
                    </Tooltip>

                    {notif.templateTab && onNavigateToTemplate && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => onNavigateToTemplate(notif.templateTab!, notif.templateSubTab)}
                            data-testid={`btn-template-${notif.type}`}
                          >
                            <Settings2 className="h-4 w-4" />
                            {notif.templateLabel}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mesaj şablonunu düzenle</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Kişisel Bildirim Tercihleriniz
          </CardTitle>
          <CardDescription>
            Size gönderilecek bildirimlerin kanal ve ayarlarını belirleyin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {USER_NOTIFICATION_TYPES.map((notif) => {
            const pref = getUserPrefForType(notif.type);
            const enabled = pref?.enabled ?? true;
            const channels: string[] = pref?.channels ?? ['app'];
            const isSaving = savingUserType === notif.type;

            return (
              <div
                key={notif.type}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg gap-4"
                data-testid={`user-notification-${notif.type}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleUserToggleEnabled(notif.type, checked)}
                      disabled={isSaving}
                      data-testid={`switch-user-${notif.type}`}
                    />
                    <span className="font-medium">{notif.label}</span>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-11">{notif.description}</p>
                </div>

                {enabled && (
                  <div className="flex items-center gap-2 ml-11 sm:ml-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={channels.includes('app') ? 'default' : 'outline'}
                          className="gap-1"
                          onClick={() => handleUserToggleChannel(notif.type, 'app', channels)}
                          disabled={isSaving}
                          data-testid={`btn-user-app-${notif.type}`}
                        >
                          <Bell className="h-4 w-4" />
                          Uygulama
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Uygulama içi bildirim al</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={channels.includes('email') ? 'default' : 'outline'}
                          className="gap-1"
                          onClick={() => handleUserToggleChannel(notif.type, 'email', channels)}
                          disabled={isSaving}
                          data-testid={`btn-user-email-${notif.type}`}
                        >
                          <Mail className="h-4 w-4" />
                          E-posta
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>E-posta ile bildirim al</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={channels.includes('whatsapp') ? 'default' : 'outline'}
                          className="gap-1"
                          onClick={() => handleUserToggleChannel(notif.type, 'whatsapp', channels)}
                          disabled={isSaving}
                          data-testid={`btn-user-whatsapp-${notif.type}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>WhatsApp ile bildirim al</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            Bildirim Kanalları Hakkında
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Uygulama Bildirimleri</p>
                <p>Uygulama içinde bildirim alırsınız. Her zaman aktiftir ve ek yapılandırma gerektirmez.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">WhatsApp</p>
                <p>WhatsApp üzerinden bildirim gönderilir. Twilio entegrasyonu gerektirir.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">E-posta</p>
                <p>E-posta ile bildirim gönderilir. Gmail entegrasyonu gerektirir.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Agency Management Section Component
function AgencyManagementSection() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canManageAgencies = hasPermission(PERMISSION_KEYS.FINANCE_MANAGE);
  const [agencyDialogOpen, setAgencyDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [agencyForm, setAgencyForm] = useState({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  // Fetch agencies (suppliers)
  const { data: agencies = [], isLoading } = useQuery<Agency[]>({
    queryKey: ['/api/finance/agencies']
  });

  // Create agency mutation
  const createAgencyMutation = useMutation({
    mutationFn: async (data: { name: string; contactInfo: string; defaultPayoutPerGuest: number; notes: string }) => {
      const res = await apiRequest('POST', '/api/finance/agencies', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setAgencyDialogOpen(false);
      toast({ title: "Acenta eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Acenta eklenemedi", variant: "destructive" });
    }
  });

  // Update agency mutation
  const updateAgencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; contactInfo: string; defaultPayoutPerGuest: number; notes: string } }) => {
      const res = await apiRequest('PATCH', `/api/finance/agencies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setAgencyDialogOpen(false);
      toast({ title: "Acenta g\u00fcncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Acenta g\u00fcncellenemedi", variant: "destructive" });
    }
  });

  // Delete agency mutation
  const deleteAgencyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/finance/agencies/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      toast({ title: "Acenta silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Acenta silinemedi", variant: "destructive" });
    }
  });

  const openCreateAgencyDialog = () => {
    setEditingAgency(null);
    setAgencyForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
    setAgencyDialogOpen(true);
  };

  const openEditAgencyDialog = (agency: Agency) => {
    setEditingAgency(agency);
    setAgencyForm({
      name: agency.name,
      contactInfo: agency.contactInfo || '',
      defaultPayoutPerGuest: agency.defaultPayoutPerGuest || 0,
      notes: agency.notes || ''
    });
    setAgencyDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!agencyForm.name.trim()) {
      toast({ title: "Hata", description: "Acenta ad\u0131 zorunludur", variant: "destructive" });
      return;
    }
    if (editingAgency) {
      updateAgencyMutation.mutate({ id: editingAgency.id, data: agencyForm });
    } else {
      createAgencyMutation.mutate(agencyForm);
    }
  };

  if (!canManageAgencies) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Acenta y\u00f6netimi i\u00e7in finans yetkisi gereklidir.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Acenta Y\u00f6netimi
              </CardTitle>
              <CardDescription>
                Tedarik\u00e7i acentalar\u0131n\u0131z\u0131 y\u00f6netin
              </CardDescription>
            </div>
            <Button onClick={openCreateAgencyDialog} data-testid="button-add-agency">
              <Plus className="h-4 w-4 mr-2" />
              Acenta Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Hen\u00fcz acenta eklenmemi\u015f</p>
              <Button variant="outline" className="mt-4" onClick={openCreateAgencyDialog}>
                <Plus className="h-4 w-4 mr-2" />
                \u0130lk Acentay\u0131 Ekle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agencies.map(agency => {
                const isPartnerAgency = agency.isSmartUser && agency.partnerTenantId;
                return (
                  <Card key={agency.id} data-testid={`card-agency-${agency.id}`} className={isPartnerAgency ? 'border-2 border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/30' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {agency.name}
                          {isPartnerAgency && (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-xs">
                              Partner
                            </Badge>
                          )}
                        </CardTitle>
                        {!isPartnerAgency && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditAgencyDialog(agency)} data-testid={`button-edit-agency-${agency.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (confirm(`${agency.name} acentas\u0131n\u0131 ve t\u00fcm \u00f6deme kay\u0131tlar\u0131n\u0131 silmek istedi\u011finize emin misiniz?`)) {
                                deleteAgencyMutation.mutate(agency.id);
                              }
                            }} data-testid={`button-delete-agency-${agency.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {agency.contactInfo && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{agency.contactInfo}</span>
                        </div>
                      )}
                      {agency.notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">{agency.notes}</span>
                        </div>
                      )}
                      {!agency.contactInfo && !agency.notes && (
                        <p className="text-sm text-muted-foreground">İletişim bilgisi eklenmemiş</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agency Dialog */}
      <Dialog open={agencyDialogOpen} onOpenChange={setAgencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgency ? 'Acenta D\u00fczenle' : 'Yeni Acenta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agencyName">Acenta Ad\u0131 *</Label>
              <Input
                id="agencyName"
                value={agencyForm.name}
                onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Acenta ad\u0131n\u0131 girin"
                data-testid="input-agency-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencyContact">\u0130leti\u015fim</Label>
              <Input
                id="agencyContact"
                value={agencyForm.contactInfo}
                onChange={e => setAgencyForm(f => ({ ...f, contactInfo: e.target.value }))}
                placeholder="Telefon veya e-posta"
                data-testid="input-agency-contact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencyPayout">Ki\u015fi Ba\u015f\u0131 \u00d6deme (TL)</Label>
              <Input
                id="agencyPayout"
                type="number"
                value={agencyForm.defaultPayoutPerGuest}
                onChange={e => setAgencyForm(f => ({ ...f, defaultPayoutPerGuest: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                data-testid="input-agency-payout"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencyNotes">Notlar</Label>
              <Textarea
                id="agencyNotes"
                value={agencyForm.notes}
                onChange={e => setAgencyForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ek notlar..."
                data-testid="input-agency-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgencyDialogOpen(false)}>
              \u0130ptal
            </Button>
            <Button onClick={handleSubmit} disabled={createAgencyMutation.isPending || updateAgencyMutation.isPending} data-testid="button-save-agency">
              {(createAgencyMutation.isPending || updateAgencyMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingAgency ? 'G\u00fcncelle' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
