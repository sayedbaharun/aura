
import { taskStatusEnum } from './shared/schema';

console.log('Verifying taskStatusEnum values...');
const values = taskStatusEnum.enumValues;
console.log('Current values:', values);

if (values.includes('backlog')) {
    console.log('SUCCESS: "backlog" is present in taskStatusEnum.');
} else {
    console.error('FAILURE: "backlog" is MISSING from taskStatusEnum.');
    process.exit(1);
}
