
import 'dotenv/config';
import { storage } from "../server/storage";

async function listVentures() {
    try {
        console.log("Fetching ventures...");
        const ventures = await storage.getVentures();
        console.log(`Found ${ventures.length} ventures.`);

        const active = ventures.filter(v =>
            ['ongoing', 'building', 'planning', 'active', 'development'].includes(v.status)
        );

        console.log("Active Ventures (should appear in Dashboard):");
        active.forEach(v => {
            console.log(`- [${v.status}] ${v.name}`);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

listVentures();
