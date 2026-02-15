import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp } from "lucide-react";
import FaultyTerminal from "@/components/FaultyTerminal";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const body = isSignup
        ? { email, password, firstName, lastName, platforms }
        : { email, password, platforms };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (isSignup) {
          const integrations = {
            amazon: { connected: platforms.includes("Amazon"), lastSync: null, accountId: null },
            flipkart: { connected: platforms.includes("Flipkart"), lastSync: null, accountId: null },
            meesho: { connected: platforms.includes("Meesho"), lastSync: null, accountId: null },
          };
          try {
            await setDoc(doc(db, "users", email), {
              integrations,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {
            // Firestore write failures shouldn't block login; continue
          }
        }
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        setLocation("/landing");
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.message || "Authentication failed", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <FaultyTerminal
          scale={1.5}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.5}
          pause={false}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#A7EF9E"
          mouseReact
          mouseStrength={0.5}
          pageLoadAnimation
          brightness={0.6}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="w-full bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <motion.div
              layoutId="logo"
              className="flex items-center justify-center gap-2 mb-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              {isSignup ? "Create an account" : "Welcome back"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isSignup
                ? "Enter your details to get started with CommercialQ"
                : "Enter your credentials to access your dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignup ? (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="space-y-2">
                      <Input
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-primary/50"
                      />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-primary/50"
                />
              </div>

              {isSignup && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Select Marketplaces</label>
                  <div className="flex gap-2">
                    {["Amazon", "Flipkart", "Meesho"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlatforms(prev => 
                          prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                        )}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          platforms.includes(p)
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  isSignup ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black/40 px-2 text-gray-500 backdrop-blur-xl">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {isSignup ? (
                  <>Already have an account? <span className="text-primary hover:underline">Sign in</span></>
                ) : (
                  <>Don't have an account? <span className="text-primary hover:underline">Sign up</span></>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
