import 'dotenv/config';
import { storage } from "../server/storage";

async function testReadiness() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log("Testing readiness for date:", today);

        const entries = await storage.getHealthEntries({ dateGte: today, dateLte: today });
        const entry = entries[0];

        if (!entry) {
            console.log("No health entry found for today.");
            return;
        }

        console.log("Found entry:", entry);

        // Replicate logic from routes.ts
        let score = 0;

        // 1. Sleep (50%)
        if (entry.sleepHours) {
            const sleepScore = Math.min((entry.sleepHours / 8) * 50, 50);
            console.log(`Sleep: ${entry.sleepHours}h -> ${sleepScore} points`);
            score += sleepScore;
        }

        // 2. Energy (20%)
        if (entry.energyLevel) {
            const energyScore = (entry.energyLevel / 5) * 20;
            console.log(`Energy: ${entry.energyLevel}/5 -> ${energyScore} points`);
            score += energyScore;
        }

        // 3. Mood (15%)
        let moodScore = 0;
        if (entry.mood === 'peak' || entry.mood === 'high') {
            moodScore = 15;
        } else if (entry.mood === 'medium') {
            moodScore = 10;
        } else {
            moodScore = 5;
        }
        console.log(`Mood: ${entry.mood} -> ${moodScore} points`);
        score += moodScore;

        // 4. Stress (10%)
        let stressScore = 0;
        if (entry.stressLevel === 'low') {
            stressScore = 10;
        } else if (entry.stressLevel === 'medium') {
            stressScore = 5;
        }
        console.log(`Stress: ${entry.stressLevel} -> ${stressScore} points`);
        score += stressScore;

        // 5. Workout (5%)
        const workoutScore = entry.workoutDone ? 5 : 0;
        console.log(`Workout: ${entry.workoutDone} -> ${workoutScore} points`);
        score += workoutScore;

        score = Math.round(score);
        console.log("Total Score:", score);

    } catch (error) {
        console.error("Error:", error);
    }
}

testReadiness();
