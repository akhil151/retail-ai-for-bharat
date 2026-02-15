import type { Express, Request, Response } from "express";
import * as session from "express-session";
import { db, userPreferences } from "./db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
      };
      firstName?: string;
      lastName?: string;
      email?: string;
      profileImageUrl?: string;
      platforms?: string[];
    }
  }
}

export async function setupAuth(app: Express) {
  app.use(
    session.default({
      secret: process.env.SESSION_SECRET || "marketplace-copilot-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
    })
  );

  app.use((req: any, res, next) => {
    req.isAuthenticated = () => !!req.session?.user;
    req.user = req.session?.user;
    next();
  });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: any, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    
    const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, email));
    const platforms = prefs.length > 0 ? JSON.parse(prefs[0].platforms) : [];
    
    req.session.user = {
      id: email,
      claims: { sub: email },
      firstName: email.split('@')[0],
      lastName: "User",
      email,
      platforms
    };
    
    req.session.save((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json({ success: true });
    });
  });

  app.post("/api/auth/signup", async (req: any, res) => {
    const { email, password, firstName, lastName, platforms } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "All fields required" });
    }
    
    const userPlatforms = Array.isArray(platforms) ? platforms : [];
    
    await db.insert(userPreferences).values({
      userId: email,
      platforms: JSON.stringify(userPlatforms)
    }).onConflictDoUpdate({
      target: userPreferences.userId,
      set: { platforms: JSON.stringify(userPlatforms), updatedAt: new Date() }
    });
    
    req.session.user = {
      id: email,
      claims: { sub: email },
      firstName,
      lastName,
      email,
      platforms: userPlatforms
    };
    
    req.session.save((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", (req: any, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  
  app.post("/api/auth/update-platforms", async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { platforms } = req.body;
    if (!Array.isArray(platforms)) {
      return res.status(400).json({ message: "Platforms must be an array" });
    }
    
    const userId = req.user.claims.sub;
    await db.insert(userPreferences).values({
      userId,
      platforms: JSON.stringify(platforms)
    }).onConflictDoUpdate({
      target: userPreferences.userId,
      set: { platforms: JSON.stringify(platforms), updatedAt: new Date() }
    });
    
    req.session.user.platforms = platforms;
    req.session.save((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json({ success: true, platforms });
    });
  });
}
