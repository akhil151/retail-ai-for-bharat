import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useFirestorePlatforms() {
    const { user } = useAuth();
    const [firestorePlatforms, setFirestorePlatforms] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        const unsub = onSnapshot(doc(db, "users", user.id.toString()), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.integrations) {
                    const connected = [];
                    if (data.integrations.amazon?.connected) connected.push("Amazon");
                    if (data.integrations.flipkart?.connected) connected.push("Flipkart");
                    if (data.integrations.meesho?.connected) connected.push("Meesho");
                    setFirestorePlatforms(connected);
                }
            }
            setLoading(false);
        });

        return () => unsub();
    }, [user?.id]);

    const availablePlatforms = useMemo(() => {
        // If we loaded from Firestore and found connected platforms, use them
        if (firestorePlatforms.length > 0) return firestorePlatforms;

        // Fallback: If loading is done and nothing in Firestore, try Postgres user.platforms
        // If that's also empty, default to ALL (or maybe none? "All" is safer for exploration)
        if (!loading && user?.platforms && user.platforms.length > 0) {
            return user.platforms;
        }

        // Default fallback if nothing is configured yet
        return ["Amazon", "Flipkart", "Meesho"];
    }, [firestorePlatforms, user?.platforms, loading]);

    return { platforms: availablePlatforms, loading };
}
