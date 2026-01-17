import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "../../i18n/LanguageContext";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const { t } = useLanguage();
  
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Button
        variant={selectedCategory === null ? "default" : "outline"}
        size="sm"
        onClick={() => onCategoryChange(null)}
        data-testid="filter-all"
      >
        {t.activities.filterAll}
      </Button>
      {categories.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category)}
          data-testid={`filter-${category}`}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
