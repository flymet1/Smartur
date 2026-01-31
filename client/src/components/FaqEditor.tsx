import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, HelpCircle, Bot, Globe } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
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
  const addFaq = () => {
    onChange([...faq, { question: "", answer: "", botOnly: false }]);
  };

  const removeFaq = (index: number) => {
    onChange(faq.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: keyof FaqItem, value: string | boolean) => {
    const newFaq = [...faq];
    newFaq[index] = { ...newFaq[index], [field]: value };
    onChange(newFaq);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label className="text-base">Sık Sorulan Sorular</Label>
            <p className="text-xs text-muted-foreground">Bot bu bilgileri müşterilere cevap vermek için kullanır</p>
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
                  <Label className="text-sm font-medium">Soru {idx + 1}</Label>
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
                <Label className="text-sm font-medium">Cevap</Label>
                <Textarea
                  placeholder="Örn: Evet, 110 kg üzeri için ek ücret uygulanır."
                  value={item.answer}
                  onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                  className="min-h-[60px]"
                  data-testid={`${testIdPrefix}-answer-${idx}`}
                />
              </div>
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
