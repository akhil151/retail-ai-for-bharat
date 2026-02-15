import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    CheckCircle2,
    AlertCircle,
    Link as LinkIcon,
    Unlink,
    Loader2,
    Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Integration States
    const [integrations, setIntegrations] = useState({
        amazon: { connected: false, lastSync: null as string | null, accountId: null as string | null },
        flipkart: { connected: false, lastSync: null as string | null, accountId: null as string | null },
        meesho: { connected: false, lastSync: null as string | null, accountId: null as string | null }
    });

    // Load settings from Firestore
    useEffect(() => {
        const loadSettings = async () => {
            if (!user?.id) return;
            try {
                const docRef = doc(db, "users", user.id.toString());
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.integrations) {
                        setIntegrations(prev => ({ ...prev, ...data.integrations }));
                    }
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            }
        };
        loadSettings();
    });

    // User details state (mock)
    const [profile, setProfile] = useState({
        name: user?.firstName ? `${user.firstName} ${user.lastName}` : "",
        email: user?.email || "",
        phone: "",
        company: ""
    });

    const handleConnect = async (platform: keyof typeof integrations) => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // In a real app, this would redirect to OAuth or open a modal
            const newIntegrationState = {
                connected: true,
                lastSync: "Just now",
                accountId: `MOCK_${platform.toUpperCase()}_${Date.now()}`
            };

            const updatedIntegrations = {
                ...integrations,
                [platform]: newIntegrationState
            };

            setIntegrations(updatedIntegrations);

            await setDoc(doc(db, "users", user.id.toString()), {
                integrations: updatedIntegrations,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            toast({
                title: "Integration Successful",
                description: `Successfully connected to ${platform.charAt(0).toUpperCase() + platform.slice(1)}. Data import started.`,
            });
        } catch (error) {
            console.error("Error saving integration:", error);
            toast({
                title: "Connection Failed",
                description: "Could not save integration status.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (platform: keyof typeof integrations) => {
        if (!user?.id) return;
        try {
            const updatedIntegrations = {
                ...integrations,
                [platform]: { connected: false, lastSync: null, accountId: null }
            };

            setIntegrations(updatedIntegrations);

            await setDoc(doc(db, "users", user.id.toString()), {
                integrations: updatedIntegrations,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            toast({
                title: "Disconnected",
                description: `Disconnected from ${platform.charAt(0).toUpperCase() + platform.slice(1)}.`,
                variant: "destructive"
            });
        } catch (error) {
            console.error("Error disconnecting:", error);
            toast({
                title: "Error",
                description: "Failed to update disconnection status.",
                variant: "destructive"
            });
        }
    };

    const handleSaveProfile = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            toast({
                title: "Profile Updated",
                description: "Your settings have been saved successfully.",
            });
        }, 1000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your integrations and account preferences.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Integrations Section */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <LinkIcon className="w-5 h-5" /> Marketplace Integrations
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Connect your seller accounts to import orders, inventory, and settlements directly.
                            We use read-only access to fetch your data.
                        </p>
                    </div>

                    {/* Amazon */}
                    <Card className="border-l-4 border-l-[#FF9900]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-bold">Amazon Seller Central</CardTitle>
                            {integrations.amazon.connected ? (
                                <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                                </div>
                            ) : (
                                <div className="flex items-center text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded-full">
                                    <Unlink className="w-3 h-3 mr-1" /> Not Connected
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500 mb-4">
                                {integrations.amazon.connected
                                    ? `Syncing daily. Last synced: ${integrations.amazon.lastSync}`
                                    : "Connect to sync orders & inventory."}
                            </div>
                            {integrations.amazon.connected ? (
                                <Button variant="outline" size="sm" onClick={() => handleDisconnect('amazon')} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                                    Disconnect
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => handleConnect('amazon')} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Connect Amazon
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Flipkart */}
                    <Card className="border-l-4 border-l-[#2874F0]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-bold">Flipkart Seller Hub</CardTitle>
                            {integrations.flipkart.connected ? (
                                <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                                </div>
                            ) : (
                                <div className="flex items-center text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded-full">
                                    <Unlink className="w-3 h-3 mr-1" /> Not Connected
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500 mb-4">
                                {integrations.flipkart.connected
                                    ? `Syncing daily. Last synced: ${integrations.flipkart.lastSync}`
                                    : "Connect to sync orders & inventory."}
                            </div>
                            {integrations.flipkart.connected ? (
                                <Button variant="outline" size="sm" onClick={() => handleDisconnect('flipkart')} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                                    Disconnect
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => handleConnect('flipkart')} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Connect Flipkart
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Meesho */}
                    <Card className="border-l-4 border-l-[#f43397]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-bold">Meesho Supplier Panel</CardTitle>
                            {integrations.meesho.connected ? (
                                <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                                </div>
                            ) : (
                                <div className="flex items-center text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded-full">
                                    <Unlink className="w-3 h-3 mr-1" /> Not Connected
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500 mb-4">
                                {integrations.meesho.connected
                                    ? `Syncing daily. Last synced: ${integrations.meesho.lastSync}`
                                    : "Connect to sync orders & inventory."}
                            </div>
                            {integrations.meesho.connected ? (
                                <Button variant="outline" size="sm" onClick={() => handleDisconnect('meesho')} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                                    Disconnect
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => handleConnect('meesho')} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Connect Meesho
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Profile Section */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Profile Details</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Update your personal and company information.
                        </p>
                    </div>

                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="company">Company Name</Label>
                                <Input
                                    id="company"
                                    value={profile.company}
                                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-end">
                            <Button onClick={handleSaveProfile} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Preferences</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Receive daily summaries via email.</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Dark Mode</Label>
                                    <p className="text-sm text-muted-foreground">Toggle application theme.</p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
