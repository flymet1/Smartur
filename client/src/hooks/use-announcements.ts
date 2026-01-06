import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  isActive: boolean | null;
  createdAt: string | null;
}

export function useAnnouncements() {
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('dismissedAnnouncements');
    if (stored) {
      try {
        setDismissedAnnouncements(JSON.parse(stored));
      } catch {
        setDismissedAnnouncements([]);
      }
    }
  }, []);

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
  });

  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => 
      a.isActive && !dismissedAnnouncements.includes(a.id)
    );
  }, [announcements, dismissedAnnouncements]);

  const dismissAnnouncement = (id: number) => {
    const updated = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(updated);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(updated));
  };

  return {
    announcements: activeAnnouncements,
    dismissAnnouncement,
  };
}
