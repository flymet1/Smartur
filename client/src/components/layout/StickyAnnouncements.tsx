import { useState } from "react";
import { X, AlertTriangle, Info, AlertCircle, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAnnouncements } from "@/hooks/use-announcements";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  isActive: boolean | null;
  createdAt: string | null;
}

function getAnnouncementIcon(type: string) {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />;
    case 'info':
      return <Info className="h-4 w-4" />;
    case 'urgent':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Megaphone className="h-4 w-4" />;
  }
}

function getAnnouncementStyle(type: string) {
  switch (type) {
    case 'warning':
      return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200";
    case 'info':
      return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200";
    case 'urgent':
      return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200";
    default:
      return "bg-muted border-border text-foreground";
  }
}

function getTypeBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case 'warning':
      return "secondary";
    case 'urgent':
      return "destructive";
    default:
      return "outline";
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'warning':
      return "Uyari";
    case 'info':
      return "Bilgi";
    case 'urgent':
      return "Acil";
    default:
      return "Duyuru";
  }
}

export function StickyAnnouncements() {
  const { announcements, dismissAnnouncement } = useAnnouncements();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  if (announcements.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed top-28 right-6 z-40 flex flex-col gap-2 max-h-[60vh] overflow-y-auto w-64">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={cn(
              "relative p-3 rounded-md border shadow-md cursor-pointer transition-all hover:shadow-lg group",
              getAnnouncementStyle(announcement.type)
            )}
            onClick={() => setSelectedAnnouncement(announcement)}
            data-testid={`sticky-announcement-${announcement.id}`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {getAnnouncementIcon(announcement.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{announcement.title}</div>
                <div className="text-xs opacity-75 line-clamp-2 mt-0.5">{announcement.content}</div>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                dismissAnnouncement(announcement.id);
              }}
              data-testid={`button-dismiss-sticky-${announcement.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedAnnouncement && getAnnouncementIcon(selectedAnnouncement.type)}
              <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
            </div>
            {selectedAnnouncement && (
              <Badge variant={getTypeBadgeVariant(selectedAnnouncement.type)} className="w-fit">
                {getTypeLabel(selectedAnnouncement.type)}
              </Badge>
            )}
          </DialogHeader>
          <DialogDescription className="text-foreground whitespace-pre-wrap">
            {selectedAnnouncement?.content}
          </DialogDescription>
          {selectedAnnouncement?.createdAt && (
            <div className="text-xs text-muted-foreground mt-2">
              {new Date(selectedAnnouncement.createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
