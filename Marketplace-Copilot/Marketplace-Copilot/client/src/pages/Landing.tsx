import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, PackageSearch, Zap, ArrowRight } from "lucide-react";
import PixelBlast from "@/components/PixelBlast";
import TextType from "@/components/TextType";
import CardNav from "@/components/CardNav";
import ScrollStack from "@/components/ScrollStack";

export default function Landing() {
  const { user, logout } = useAuth();
  const navItems = [
    {
      label: "Sales Forecasting",
      bgColor: "#1a1a1a",
      textColor: "#fff",
      links: [
        { label: "Demand Prediction", ariaLabel: "Sales Demand Prediction", href: "/demand-prediction" },
        { label: "Trend Analysis", ariaLabel: "Sales Trend Analysis", href: "#trends" }
      ]
    },
    {
      label: "Stock Recommendation",
      bgColor: "#2a2a2a",
      textColor: "#fff",
      links: [
        { label: "Inventory Optimization", ariaLabel: "Inventory Optimization", href: "/stock-analysis" },
        { label: "Reorder Alerts", ariaLabel: "Reorder Alerts", href: "/stock-analysis" }
      ]
    },
    {
      label: "Price Suggestion",
      bgColor: "#3a3a3a",
      textColor: "#fff",
      links: [
        { label: "Dashboard", ariaLabel: "Price Suggestion Dashboard", href: "/price-suggestion" },
        { label: "View Analysis", ariaLabel: "Price Analysis", href: "/price-suggestion" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative">
      {/* CardNav */}
      <CardNav
        logo=""
        logoAlt="CommercialQ"
        items={navItems}
        baseColor="#000"
        menuColor="#FFD700"
        buttonBgColor="#FFD700"
        buttonTextColor="#000"
        user={user}
        onLogout={() => logout()}
      />

      {/* PixelBlast Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#FFD700"
          patternScale={2}
          patternDensity={1}
          pixelSizeJitter={0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          speed={0.5}
          edgeFade={0.25}
          transparent={false}
        />
      </div>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            AI-Powered Intelligence for Sellers
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]">
            <TextType
              text={["Dominate Marketplaces with AI Insights", "Maximize Your Sales with Data", "Grow Your Business Intelligently"]}
              typingSpeed={75}
              pauseDuration={2000}
              deletingSpeed={50}
              showCursor
              cursorCharacter="_"
              className="text-white"
            />
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Stop guessing. Use advanced demand forecasting, pricing intelligence, and inventory analytics to maximize profit on Amazon, Flipkart, and Meesho.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-12 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform bg-primary text-black hover:bg-primary/90" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg rounded-full hover:bg-white/10 text-white border-white/20" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </div>

          {/* Abstract Dashboard Preview */}
          <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl border border-border/50 bg-card/50 p-2 shadow-2xl">
            <div className="rounded-xl overflow-hidden bg-background border border-border/50 aspect-video flex items-center justify-center relative group">
              {/* Unsplash image for analytics dashboard concept */}
              {/* analytics dashboard charts */}
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=900&fit=crop"
                alt="Dashboard Preview"
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll Stack Section */}
      <div className="relative z-10 bg-black/80 backdrop-blur-3xl pt-20">
        <div className="text-center mb-10 px-4">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">Master Your Marketplace</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">See how CommercialQ transforms your data into action.</p>
        </div>

        <ScrollStack
          items={[
            {
              title: "Inventory Intelligence",
              description: "Stop guessing stock levels. Get precise valuation, low-stock alerts, and warehouse distribution at a glance. We track every unit across Amazon, Flipkart, and Meesho.",
              src: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60",
              color: "#e0f2fe" // light blue
            },
            {
              title: "Sales Forecast AI",
              description: "Predict the future. Our advanced AI model analyzes historical sales velocity to forecast demand for the next 14 days with 95% accuracy.",
              src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60",
              color: "#f0fdf4" // light green
            },
            {
              title: "Profit & Margin Analytics",
              description: "Revenue is vanity, profit is sanity. See your real net margin per product after platform fees, taxes, and shipping costs are deducted.",
              src: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60",
              color: "#fff7ed" // light orange
            },
            {
              title: "Smart Pricing Engine",
              description: "Win the Buy Box without sacrificing profit. Our dynamic repricer adjusts your prices 24/7 based on competitor moves and your margin goals.",
              src: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=60",
              color: "#fef9c3" // light yellow
            },
            {
              title: "Global Platform Control",
              description: "One dashboard to rule them all. Filter your entire business view by platform. Secure, partitioned data ensures you only see what you need.",
              src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60",
              color: "#fdf2f8" // light pink
            }
          ]}
        />
      </div>

      {/* Detailed Features Breakdown */}
      <section className="py-32 bg-zinc-950 relative z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-16 items-center mb-32"
          >
            <div className="space-y-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-4xl font-bold text-white">Data-Driven Decisions, Not Gut Feelings.</h3>
              <p className="text-lg text-gray-400 leading-relaxed">
                Most sellers fly blind. CommercialQ aggregates data from all your channels to give you a single source of truth.
                Visualize sales trends, identify slow-moving stock, and capitalize on high-velocity items before your competitors do.
              </p>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Real-time API Integrations
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Historical Trend Analysis
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Automated Reporting
                </li>
              </ul>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 aspect-square">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60" className="opacity-80 object-cover w-full h-full hover:scale-105 transition-transform duration-700" alt="Analytics" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-16 items-center mb-32 md:flex-row-reverse"
          >
            <div className="relative group md:order-2">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 aspect-square">
                <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60" className="opacity-80 object-cover w-full h-full hover:scale-105 transition-transform duration-700" alt="Inventory" />
              </div>
            </div>
            <div className="space-y-8 md:order-1">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <PackageSearch className="w-8 h-8" />
              </div>
              <h3 className="text-4xl font-bold text-white">Smart Inventory Management.</h3>
              <p className="text-lg text-gray-400 leading-relaxed">
                Overstocking kills cash flow. Stockouts kill rankings. Our inventory engine balances your stock perfectly.
                Get automated alerts when it's time to reorder, calculated based on your current sales velocity and lead times.
              </p>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low Stock Warnings
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Stock Value Estimation
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Multi-Warehouse Support
                </li>
              </ul>
            </div>
          </motion.div>

          <div className="text-center mt-20">
            <h3 className="text-3xl font-bold text-white mb-8">Ready to scale your business?</h3>
            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-2xl shadow-primary/20 bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all" asChild>
              <Link href="/dashboard">Get Started Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
            </Button>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12 px-4 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg text-white">CommercialQ</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 CommercialQ AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
