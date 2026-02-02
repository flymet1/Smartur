import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, HelpCircle, Bot, Globe, Pencil, X, Check } from "lucide-react";

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editBotOnly, setEditBotOnly] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newBotOnly, setNewBotOnly] = useState(false);

  const addFaq = () => {
    if (newQuestion.trim() && newAnswer.trim()) {
      onChange([{ question: newQuestion.trim(), answer: newAnswer.trim(), botOnly: newBotOnly }, ...faq]);
      setNewQuestion("");
      setNewAnswer("");
      setNewBotOnly(false);
      setIsAdding(false);
    }
  };

  const removeFaq = (index: number) => {
    onChange(faq.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    const item = faq[index];
    setEditingIndex(index);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
    setEditBotOnly(item.botOnly || false);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditQuestion("");
    setEditAnswer("");
    setEditBotOnly(false);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editQuestion.trim() && editAnswer.trim()) {
      const newFaq = [...faq];
      newFaq[editingIndex] = { 
        ...newFaq[editingIndex], 
        question: editQuestion.trim(), 
        answer: editAnswer.trim(),
        botOnly: editBotOnly
      };
      onChange(newFaq);
      cancelEdit();
    }
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
      </div>

      {/* Add New FAQ Form */}
      {isAdding ? (
        <div className="p-3 bg-muted/30 rounded-md border border-primary/30 space-y-2">
          <Input
            placeholder="Soru (Türkçe) - örn: Kilo sınırı var mı?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="h-8 text-sm"
            data-testid={`${testIdPrefix}-new-question`}
            autoFocus
          />
          <Textarea
            placeholder="Cevap (Türkçe)"
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            rows={2}
            data-testid={`${testIdPrefix}-new-answer`}
          />
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="newBotOnly" className="text-xs text-muted-foreground">
                Sadece Bot
              </Label>
              <Switch
                id="newBotOnly"
                checked={newBotOnly}
                onCheckedChange={setNewBotOnly}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setIsAdding(false); setNewQuestion(""); setNewAnswer(""); setNewBotOnly(false); }}
              >
                <X className="w-4 h-4 mr-1" /> İptal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={addFaq}
                disabled={!newQuestion.trim() || !newAnswer.trim()}
                data-testid={`${testIdPrefix}-save-new`}
              >
                <Check className="w-4 h-4 mr-1" /> Kaydet
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => setIsAdding(true)}
          data-testid={`${testIdPrefix}-add-button`}
        >
          <Plus className="w-4 h-4 mr-1" /> SSS Ekle
        </Button>
      )}

      {/* FAQ List */}
      {faq.length > 0 ? (
        <div className="space-y-1">
          {faq.map((item, idx) => (
            <div key={idx}>
              {editingIndex === idx ? (
                /* Edit Mode */
                <div className="p-3 bg-muted/30 rounded-md border border-primary/30 space-y-2">
                  <Input
                    placeholder="Soru (Türkçe)"
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    className="h-8 text-sm"
                    data-testid={`${testIdPrefix}-edit-question-${idx}`}
                    autoFocus
                  />
                  <Textarea
                    placeholder="Cevap (Türkçe)"
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    className="min-h-[60px] text-sm resize-none"
                    rows={2}
                    data-testid={`${testIdPrefix}-edit-answer-${idx}`}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor={`editBotOnly-${idx}`} className="text-xs text-muted-foreground">
                        Sadece Bot
                      </Label>
                      <Switch
                        id={`editBotOnly-${idx}`}
                        checked={editBotOnly}
                        onCheckedChange={setEditBotOnly}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                      >
                        <X className="w-4 h-4 mr-1" /> İptal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveEdit}
                        disabled={!editQuestion.trim() || !editAnswer.trim()}
                        data-testid={`${testIdPrefix}-save-edit-${idx}`}
                      >
                        <Check className="w-4 h-4 mr-1" /> Kaydet
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Display Mode - Compact */
                <div className="flex items-start justify-between py-2 px-3 hover:bg-muted/30 rounded-md group border-b border-muted last:border-b-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      {item.botOnly ? (
                        <Bot className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      ) : (
                        <Globe className="w-3 h-3 text-green-500 flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate">{item.question}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(idx)}
                      className="h-7 w-7"
                      data-testid={`${testIdPrefix}-edit-${idx}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFaq(idx)}
                      className="text-destructive hover:text-destructive h-7 w-7"
                      data-testid={`${testIdPrefix}-remove-${idx}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
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
