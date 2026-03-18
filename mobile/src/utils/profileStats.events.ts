type ProfileStatsEvent =
  | { type: "friends_delta"; delta: number }
  | { type: "groups_delta"; delta: number }
  | { type: "stats_refresh" };

type Listener = (event: ProfileStatsEvent) => void;

const listeners = new Set<Listener>();

export const profileStatsEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(event: ProfileStatsEvent) {
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.log("profileStatsEvents listener error:", error);
      }
    });
  },
};
