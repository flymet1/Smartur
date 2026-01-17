import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, ArrowLeft, Tag, Share2, Facebook, Twitter, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";
import { useState, useEffect, useMemo } from "react";
import type { PublicWebsiteData } from "../types";

const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const scripts = div.querySelectorAll('script, iframe, object, embed, form');
  scripts.forEach(el => el.remove());
  
  const allElements = div.querySelectorAll('*');
  allElements.forEach(el => {
    const attrs = Array.from(el.attributes);
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || attr.value.toLowerCase().includes('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return div.innerHTML;
};

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImageUrl: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface PublicBlogDetailProps {
  websiteData?: PublicWebsiteData;
}

export default function PublicBlogDetail({ websiteData }: PublicBlogDetailProps) {
  const { t } = useLanguage();
  const params = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [getApiUrl(`/api/website/blog/${params.slug}`)],
    enabled: !!params.slug,
  });

  const sanitizedContent = useMemo(() => {
    if (!post?.content) return '';
    return sanitizeHtml(post.content);
  }, [post?.content]);

  const updateOrCreateMeta = (name: string, content: string, property?: boolean) => {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let meta = document.querySelector(selector) as HTMLMetaElement | null;
    
    if (!meta) {
      meta = document.createElement('meta');
      if (property) {
        meta.setAttribute('property', name);
      } else {
        meta.setAttribute('name', name);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  useEffect(() => {
    if (post) {
      const pageTitle = post.metaTitle || post.title;
      const pageDescription = post.metaDescription || post.excerpt || '';
      const pageUrl = window.location.href;
      const pageImage = post.featuredImageUrl || '';

      document.title = pageTitle;
      
      if (pageDescription) {
        updateOrCreateMeta('description', pageDescription);
      }
      
      if (post.metaKeywords) {
        updateOrCreateMeta('keywords', post.metaKeywords);
      }

      updateOrCreateMeta('og:title', pageTitle, true);
      updateOrCreateMeta('og:type', 'article', true);
      updateOrCreateMeta('og:url', pageUrl, true);
      if (pageDescription) {
        updateOrCreateMeta('og:description', pageDescription, true);
      }
      if (pageImage) {
        updateOrCreateMeta('og:image', pageImage, true);
      }
      
      updateOrCreateMeta('twitter:card', 'summary_large_image');
      updateOrCreateMeta('twitter:title', pageTitle);
      if (pageDescription) {
        updateOrCreateMeta('twitter:description', pageDescription);
      }
      if (pageImage) {
        updateOrCreateMeta('twitter:image', pageImage);
      }
    }
  }, [post]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = (platform: 'facebook' | 'twitter') => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post?.title || '');
    
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="w-full h-80 rounded-lg mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-3xl font-bold mb-4">
            {t.blog?.notFound || "Blog yazısı bulunamadı"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t.blog?.notFoundDesc || "Aradığınız blog yazısı mevcut değil veya kaldırılmış olabilir."}
          </p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.blog?.backToBlog || "Blog'a Dön"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <article className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href="/blog">
            <Button variant="ghost" className="mb-8" data-testid="button-back-to-blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.blog?.backToBlog || "Blog'a Dön"}
            </Button>
          </Link>

          {post.featuredImageUrl && (
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8 shadow-lg">
              <img
                src={post.featuredImageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <header className="mb-8">
            {post.category && (
              <Badge className="mb-4" variant="secondary">
                {post.category}
              </Badge>
            )}
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight" data-testid="text-blog-post-title">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {post.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
              )}
              {post.author && (
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span>{post.author}</span>
                </div>
              )}
            </div>
          </header>

          <Separator className="my-8" />

          <div 
            className="prose prose-lg dark:prose-invert max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            data-testid="blog-post-content"
          />

          <Separator className="my-8" />

          <footer className="space-y-6">
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-medium mr-2">
                  {t.blog?.tags || "Etiketler"}:
                </span>
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <span className="text-muted-foreground font-medium">
                {t.blog?.share || "Paylaş"}:
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare('facebook')}
                  data-testid="button-share-facebook"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare('twitter')}
                  data-testid="button-share-twitter"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}
