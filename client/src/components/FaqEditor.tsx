import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, HelpCircle, Bot, Globe } from "lucide-react";

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
  const addFaq = () => {
    onChange([{ question: "", answer: "", botOnly: false }, ...faq]);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <div>
            <Label className="text-sm">Sık Sorulan Sorular</Label>
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
        <div className="space-y-2">
          {faq.map((item, idx) => (
            <div key={idx} className="p-3 bg-muted/30 rounded-md border border-muted space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Soru (Örn: Kilo sınırı var mı?)"
                  value={item.question}
                  onChange={(e) => updateFaq(idx, "question", e.target.value)}
                  className="flex-1 h-8 text-sm"
                  data-testid={`${testIdPrefix}-question-${idx}`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFaq(idx)}
                  className="text-destructive hover:text-destructive h-8 w-8"
                  data-testid={`${testIdPrefix}-remove-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Cevap (Örn: Evet, 110 kg üzeri için ek ücret uygulanır.)"
                value={item.answer}
                onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                className="min-h-[60px] text-sm resize-none"
                data-testid={`${testIdPrefix}-answer-${idx}`}
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {item.botOnly ? (
                    <Bot className="w-3.5 h-3.5 text-orange-500" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-green-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {item.botOnly ? "Sadece bot görür" : "Web sitede görünür"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
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
        <div className="py-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed">
          Henüz soru eklenmemiş
        </div>
      )}
    </div>
  );
}
