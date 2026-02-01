import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, HelpCircle, Bot, Globe, Languages, Loader2, Bold, List, CornerDownLeft } from "lucide-react";
import { useState, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FormattedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

function FormattedTextarea({ value, onChange, placeholder, className, "data-testid": testId }: FormattedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
      newCursorPos = start + before.length + selectedText.length + after.length;
    } else {
      newText = value.substring(0, start) + before + after + value.substring(end);
      newCursorPos = start + before.length;
    }

    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const addBold = () => insertAtCursor("*", "*");
  const addBullet = () => insertAtCursor("• ");
  const addLineBreak = () => insertAtCursor("\n");

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-t-md border border-b-0 border-input">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={addBold}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Kalın (*metin*)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={addBullet}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Madde işareti (•)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={addLineBreak}
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Alt satır</TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground ml-2">WhatsApp formatı</span>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`rounded-t-none ${className || ""}`}
        data-testid={testId}
      />
    </div>
  );
}

export interface FaqItem {
  question: string;
  answer: string;
  questionEn?: string;
  answerEn?: string;
  botOnly?: boolean;
}

interface FaqEditorProps {
  faq: FaqItem[];
  onChange: (faq: FaqItem[]) => void;
  testIdPrefix?: string;
}

export function parseFaq(faqJson: string | null | undefined): FaqItem[] {
  if (!faqJson) return [];
  try {
    const parsed = JSON.parse(faqJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyFaq(faq: FaqItem[]): string {
  const filtered = faq.filter(item => item.question.trim() || item.answer.trim());
  return JSON.stringify(filtered);
}

export function FaqEditor({ faq, onChange, testIdPrefix = "faq" }: FaqEditorProps) {
  const [openEnglish, setOpenEnglish] = useState<Record<number, boolean>>({});
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);

  const addFaq = () => {
    onChange([{ question: "", answer: "", questionEn: "", answerEn: "", botOnly: false }, ...faq]);
  };

  const removeFaq = (index: number) => {
    onChange(faq.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: keyof FaqItem, value: string | boolean) => {
    const newFaq = [...faq];
    newFaq[index] = { ...newFaq[index], [field]: value };
    onChange(newFaq);
  };

  const toggleEnglish = async (index: number) => {
    // Prevent concurrent translations to avoid stale closure issues
    if (translatingIndex !== null) return;
    
    const isOpening = !openEnglish[index];
    setOpenEnglish(prev => ({ ...prev, [index]: isOpening }));
    
    // Auto-translate when opening if Turkish text exists and English is empty
    if (isOpening) {
      const item = faq[index];
      if (item.question.trim() && !item.questionEn?.trim()) {
        setTranslatingIndex(index);
        try {
          const translatePromises = [];
          if (item.question.trim()) {
            translatePromises.push(
              fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: item.question.trim(), targetLang: "en" })
              }).then(r => r.json()).then(d => ({ type: "question", translation: d.translation }))
            );
          }
          if (item.answer.trim()) {
            translatePromises.push(
              fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: item.answer.trim(), targetLang: "en" })
              }).then(r => r.json()).then(d => ({ type: "answer", translation: d.translation }))
            );
          }
          const results = await Promise.all(translatePromises);
          // Update both fields at once to avoid stale closure issues
          const updates: Partial<FaqItem> = {};
          for (const result of results) {
            if (result.type === "question" && result.translation) {
              updates.questionEn = result.translation;
            } else if (result.type === "answer" && result.translation) {
              updates.answerEn = result.translation;
            }
          }
          if (Object.keys(updates).length > 0) {
            const newFaq = [...faq];
            newFaq[index] = { ...newFaq[index], ...updates };
            onChange(newFaq);
          }
        } catch (err) {
          console.error("Translation error:", err);
        } finally {
          setTranslatingIndex(null);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label className="text-base">Sık Sorulan Sorular</Label>
            <p className="text-xs text-muted-foreground">Bot bu bilgileri müşterilere cevap vermek için kullanır</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              <strong>İpucu:</strong> Aynı cevap için birden fazla soru varyasyonu virgülle ayırın. Örn: "merhaba, iyi günler, günaydın"
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addFaq}
          data-testid={`${testIdPrefix}-add-button`}
        >
          <Plus className="w-4 h-4 mr-1" /> Soru Ekle
        </Button>
      </div>

      {faq.length > 0 ? (
        <div className="space-y-4">
          {faq.map((item, idx) => (
            <div key={idx} className="p-4 bg-muted/50 rounded-lg border border-muted space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Soru {idx + 1} (Türkçe)</Label>
                  <Input
                    placeholder="Örn: Kilo sınırı var mı?"
                    value={item.question}
                    onChange={(e) => updateFaq(idx, "question", e.target.value)}
                    data-testid={`${testIdPrefix}-question-${idx}`}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFaq(idx)}
                  className="text-destructive hover:text-destructive"
                  data-testid={`${testIdPrefix}-remove-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cevap (Türkçe)</Label>
                <FormattedTextarea
                  placeholder="Örn: Evet, 110 kg üzeri için ek ücret uygulanır."
                  value={item.answer}
                  onChange={(val) => updateFaq(idx, "answer", val)}
                  className="min-h-[80px]"
                  data-testid={`${testIdPrefix}-answer-${idx}`}
                />
              </div>

              <Collapsible open={openEnglish[idx]} onOpenChange={() => toggleEnglish(idx)}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    disabled={translatingIndex === idx}
                    data-testid={`${testIdPrefix}-toggle-english-${idx}`}
                  >
                    {translatingIndex === idx ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Languages className="w-4 h-4 mr-2" />
                    )}
                    {translatingIndex === idx ? "Çevriliyor..." : openEnglish[idx] ? "İngilizce Çeviriyi Gizle" : "İngilizce Çeviri Ekle"}
                    {(item.questionEn || item.answerEn) && translatingIndex !== idx && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Ekli)</span>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3 border-t border-dashed mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">EN</span>
                      Question (English)
                    </Label>
                    <Input
                      placeholder="E.g.: Is there a weight limit?"
                      value={item.questionEn || ""}
                      onChange={(e) => updateFaq(idx, "questionEn", e.target.value)}
                      data-testid={`${testIdPrefix}-question-en-${idx}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">EN</span>
                      Answer (English)
                    </Label>
                    <FormattedTextarea
                      placeholder="E.g.: Yes, there is an extra fee for passengers over 110 kg."
                      value={item.answerEn || ""}
                      onChange={(val) => updateFaq(idx, "answerEn", val)}
                      className="min-h-[80px]"
                      data-testid={`${testIdPrefix}-answer-en-${idx}`}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-center justify-between pt-2 border-t border-muted">
                <div className="flex items-center gap-2">
                  {item.botOnly ? (
                    <Bot className="w-4 h-4 text-orange-500" />
                  ) : (
                    <Globe className="w-4 h-4 text-green-500" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {item.botOnly ? "Sadece bot görür (web sitede gizli)" : "Web sitede görünür"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`botOnly-${idx}`} className="text-xs text-muted-foreground">
                    Sadece Bot
                  </Label>
                  <Switch
                    id={`botOnly-${idx}`}
                    checked={item.botOnly || false}
                    onCheckedChange={(checked) => updateFaq(idx, "botOnly", checked)}
                    data-testid={`${testIdPrefix}-botonly-${idx}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
          Henüz soru eklenmemiş. "Soru Ekle" butonuna tıklayarak başlayın.
        </div>
      )}
    </div>
  );
}
