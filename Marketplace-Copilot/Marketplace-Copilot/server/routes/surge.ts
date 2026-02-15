import express from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);
const router = express.Router();

router.get("/intelligence", async (req, res) => {
    try {
        const userId = (req as any).user?.claims?.sub || null;
        const lead = parseInt((req.query.lead as string) || "14", 10);
        const safety = req.query.safety ? parseInt(req.query.safety as string, 10) : undefined;
        const sku = (req.query.sku as string) || undefined;

        // Detect Python executable
        let pythonBin = "python";
        if (process.platform === "win32") {
            if (fs.existsSync(path.join(process.cwd(), "venv", "Scripts", "python.exe"))) {
                pythonBin = path.join(process.cwd(), "venv", "Scripts", "python.exe");
            }
        } else {
            if (fs.existsSync(path.join(process.cwd(), "venv", "bin", "python"))) {
                pythonBin = path.join(process.cwd(), "venv", "bin", "python");
            }
        }

        const scriptPath = path.join(process.cwd(), "python_services", "surge_engine.py");

        const args = [scriptPath];
        if (userId) args.push(`--user=${userId}`);
        if (lead) args.push(`--lead=${lead}`);
        if (typeof safety === "number" && !Number.isNaN(safety)) args.push(`--safety=${safety}`);
        if (sku) args.push(`--sku=${sku}`);

        console.info("Running surge engine:", pythonBin, args.join(" "));

        const { stdout, stderr } = await execFileAsync(pythonBin, args, {
            cwd: process.cwd(),
            env: {
                ...process.env,
                DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:hi@localhost:5432/marketplace"
            }
        });

        let payload: any;
        try {
            payload = JSON.parse(stdout);
        } catch (e) {
            if (stderr) console.error("surge_engine stderr:", stderr);
            console.error("Failed to parse surge_engine output:", e, stdout);
            return res.status(500).json({ message: "Invalid engine output" });
        }

        if (stderr && /error|traceback/i.test(stderr)) {
            console.error("surge_engine stderr:", stderr);
        }

        res.json(payload);
    } catch (err) {
        console.error("Error in /api/surge/intelligence:", err);
        res.status(500).json({ message: "Internal server error", details: (err as any).message });
    }
});

export default router;
