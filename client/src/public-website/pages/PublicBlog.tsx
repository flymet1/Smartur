import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, ArrowRight, Search, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";
import { useState, useMemo } from "react";
import type { PublicWebsiteData } from "../types";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
}

interface PublicBlogProps {
  websiteData?: PublicWebsiteData;
}

export default function PublicBlog({ websiteData }: PublicBlogProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: [getApiUrl("/api/website/blog")],
  });

  const categories = useMemo(() => {
    if (!posts) return [];
    const cats = posts.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set(cats));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    let result = posts;
    
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(query) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [posts, selectedCategory, searchQuery]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen">
      <section className="relative py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-blog-title">
              {t.blog?.title || "Blog"}
            </h1>
            <p className="text-lg text-muted-foreground mb-8" data-testid="text-blog-subtitle">
              {t.blog?.subtitle || "En son haberler, ipuçları ve güncellemeler"}
            </p>

            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t.blog?.searchPlaceholder || "Blog yazısı ara..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-blog-search"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="cursor-pointer text-sm px-4 py-2"
                onClick={() => setSelectedCategory(null)}
                data-testid="button-category-all"
              >
                {t.activities?.filterAll || "Tümü"}
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className="cursor-pointer text-sm px-4 py-2"
                  onClick={() => setSelectedCategory(cat)}
                  data-testid={`button-category-${cat}`}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                {t.blog?.noResults || "Henüz blog yazısı bulunmuyor."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card 
                    className="overflow-hidden hover-elevate transition-all duration-300 h-full cursor-pointer group border-0 shadow-md hover:shadow-xl"
                    data-testid={`card-blog-post-${post.id}`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {post.featuredImageUrl ? (
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <span className="text-4xl font-bold text-primary/30">
                            {post.title.charAt(0)}
                          </span>
                        </div>
                      )}
                      {post.category && (
                        <Badge className="absolute top-4 left-4" variant="secondary">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        {post.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(post.publishedAt)}</span>
                          </div>
                        )}
                        {post.author && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{post.author}</span>
                          </div>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-muted-foreground line-clamp-3 mb-4">
                          {post.excerpt}
                        </p>
                      )}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {post.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                        <span>{t.blog?.readMore || "Devamını Oku"}</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
