import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Lightweight fetch-once hook for journey status.
// Used by Header for the "Empreendedora Renda Lucrativa" seal.
export function useJourneyStatus(user) {
  const [grandCompleted, setGrandCompleted] = useState(false);
  const [journeyCompletedAt, setJourneyCompletedAt] = useState(null);

  useEffect(() => {
    if (!user) {
      setGrandCompleted(false);
      setJourneyCompletedAt(null);
      return;
    }
    let cancelled = false;
    api.get("/journey/status")
      .then((r) => {
        if (cancelled) return;
        setGrandCompleted(!!r.data?.grand_completed);
        setJourneyCompletedAt(r.data?.journey_completed_at || null);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [user?.user_id, user]);

  return { grandCompleted, journeyCompletedAt };
}
