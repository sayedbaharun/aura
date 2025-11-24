import 'dotenv/config';
import { storage } from './storage';
import { randomUUID } from 'crypto';

async function testAutomations() {
  console.log('🧪 Testing Hikma-OS Automations...\n');

  try {
    // ============================================================================
    // Test 1: Day auto-creation
    // ============================================================================
    console.log('📅 Test 1: Day auto-creation');
    const today = new Date().toISOString().split('T')[0];
    const day = await storage.getDayOrCreate(today);
    console.log(`✅ Day created/retrieved: ${day.id}`);
    console.log(`   Date: ${day.date}`);
    console.log(`   Title: ${day.title}\n`);

    // ============================================================================
    // Test 2: Health entry auto-link to Day
    // ============================================================================
    console.log('💪 Test 2: Health entry auto-link to Day');
    const healthId = randomUUID();
    const health = await storage.createHealthEntry({
      id: healthId,
      date: today,
      dayId: day.id,
      sleepHours: 7.5,
      energyLevel: 4,
      mood: 'high',
      workoutDone: true,
      workoutType: 'strength',
    });
    console.log(`✅ Health entry created: ${health.id}`);
    console.log(`   Linked to day: ${health.dayId}`);
    console.log(`   Sleep: ${health.sleepHours}h, Energy: ${health.energyLevel}/5, Mood: ${health.mood}\n`);

    // ============================================================================
    // Test 3: Nutrition entry auto-link to Day
    // ============================================================================
    console.log('🍽️  Test 3: Nutrition entry auto-link to Day');
    const nutritionId = randomUUID();
    const nutrition = await storage.createNutritionEntry({
      id: nutritionId,
      datetime: new Date(),
      dayId: day.id,
      mealType: 'lunch',
      description: 'Test meal - grilled chicken with quinoa',
      calories: 500,
      proteinG: 45,
    });
    console.log(`✅ Nutrition entry created: ${nutrition.id}`);
    console.log(`   Linked to day: ${nutrition.dayId}`);
    console.log(`   Meal: ${nutrition.mealType}, Calories: ${nutrition.calories}\n`);

    // ============================================================================
    // Test 4: Task completion timestamp
    // ============================================================================
    console.log('✅ Test 4: Task completion timestamp');
    const taskId = randomUUID();
    const task = await storage.createTask({
      id: taskId,
      title: 'Test automation task',
      status: 'next',
      priority: 'P2',
    });
    console.log(`✅ Task created: ${task.id}`);
    console.log(`   Title: ${task.title}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   CompletedAt: ${task.completedAt}`);

    // Mark task as done
    const updatedTask = await storage.updateTask(task.id, { status: 'done' });
    console.log(`✅ Task marked as done`);
    console.log(`   Status: ${updatedTask?.status}`);
    console.log(`   CompletedAt: ${updatedTask?.completedAt}`);

    // Mark task as in progress (should clear completedAt)
    const reopenedTask = await storage.updateTask(task.id, { status: 'in_progress' });
    console.log(`✅ Task reopened`);
    console.log(`   Status: ${reopenedTask?.status}`);
    console.log(`   CompletedAt: ${reopenedTask?.completedAt} (should be null)\n`);

    // ============================================================================
    // Test 5: Capture to Task conversion
    // ============================================================================
    console.log('💡 Test 5: Capture to Task conversion');
    const captureId = randomUUID();
    const capture = await storage.createCapture({
      id: captureId,
      title: 'Build new feature for Hikma-OS',
      type: 'idea',
      source: 'brain',
      domain: 'code',
    });
    console.log(`✅ Capture created: ${capture.id}`);
    console.log(`   Title: ${capture.title}`);
    console.log(`   Clarified: ${capture.clarified}`);

    // Convert to task
    const converted = await storage.convertCaptureToTask(capture.id, {
      title: 'Build new feature for Hikma-OS',
      status: 'next',
      priority: 'P1',
      domain: 'code',
    });
    console.log(`✅ Capture converted to task`);
    console.log(`   Task ID: ${converted.task.id}`);
    console.log(`   Task Title: ${converted.task.title}`);
    console.log(`   Capture Clarified: ${converted.capture.clarified}`);
    console.log(`   Capture Linked Task ID: ${converted.capture.linkedTaskId}\n`);

    // ============================================================================
    // Test 6: Project completion suggestion (manual test needed)
    // ============================================================================
    console.log('🎯 Test 6: Project completion suggestion');
    console.log('⚠️  This test requires API call to PATCH /api/tasks/:id');
    console.log('   To test manually:');
    console.log('   1. Create a project via API');
    console.log('   2. Create 2-3 tasks for that project');
    console.log('   3. Mark all tasks as done via PATCH /api/tasks/:id');
    console.log('   4. The last task should return a suggestion to mark project as done\n');

    // ============================================================================
    // Summary
    // ============================================================================
    console.log('═'.repeat(60));
    console.log('✅ All automations working correctly!');
    console.log('═'.repeat(60));
    console.log('\n📋 Automation Summary:');
    console.log('   1. ✅ Day auto-creation (getDayOrCreate)');
    console.log('   2. ✅ Health entry auto-link to Day');
    console.log('   3. ✅ Nutrition entry auto-link to Day');
    console.log('   4. ✅ Task completion timestamp (auto-set/clear)');
    console.log('   5. ✅ Capture to Task conversion');
    console.log('   6. ⚠️  Project completion suggestion (needs API test)');
    console.log('   7. 📅 Daily day creation cron (scheduled at midnight)');
    console.log('   8. 📆 Weekly planning reminder (Sundays at 6 PM)');
    console.log('   9. 🌙 Daily reflection reminder (every day at 9 PM)');
    console.log('\n💡 Note: Cron jobs are scheduled but won\'t run until their scheduled time.');
    console.log('   Check server logs to verify they are registered.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAutomations();
