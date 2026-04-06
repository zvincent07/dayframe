"use client";

import { useEffect, useRef } from "react";
import { updateUserProfile } from "@/app/user/profile/actions";

export function TimezoneSyncer({ serverTimezone }: { serverTimezone: string }) {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    try {
      const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // If the defined timezone on the server doesn't match the client's actual timezone,
      // update the user's profile silently in the background
      if (localTimezone && localTimezone !== serverTimezone) {
        const formData = new FormData();
        formData.append("timezone", localTimezone);
        
        updateUserProfile(formData).catch(() => {
          // Silent catch for background syncs
        });
      }
    } catch (e) {
      // Ignore if Intl.DateTimeFormat is not available or fails
    }
  }, [serverTimezone]);

  return null;
}
