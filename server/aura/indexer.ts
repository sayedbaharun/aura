/**
 * Aura Data Indexer
 *
 * Indexes all user data (tasks, ventures, docs, health, etc.) into Pinecone
 * for semantic search and AI-powered insights.
 */

import { getIndex } from './pinecone';
import { generateEmbedding, chunkText } from './embedding';
import { db } from '../db';
import {
  ventures,
  projects,
  milestones,
  tasks,
  captureItems,
  days,
  healthEntries,
  nutritionEntries,
  docs,
} from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Entity types that can be indexed
 */
export type EntityType =
  | 'venture'
  | 'project'
  | 'milestone'
  | 'task'
  | 'capture'
  | 'day'
  | 'health'
  | 'nutrition'
  | 'doc';

/**
 * Metadata stored with each vector
 */
export interface VectorMetadata {
  entityType: EntityType;
  entityId: string;
  title: string;
  content: string;
  createdAt: string;
  [key: string]: any;
}

/**
 * Index all entities into Pinecone
 */
export async function indexAllData() {
  console.log('🚀 Starting full data indexing...');

  await indexVentures();
  await indexProjects();
  await indexMilestones();
  await indexTasks();
  await indexCaptures();
  await indexDays();
  await indexDocs();

  console.log('✅ Full data indexing complete!');
}

/**
 * Index all ventures
 */
async function indexVentures() {
  const allVentures = await db.select().from(ventures);
  const index = await getIndex();

  console.log(`Indexing ${allVentures.length} ventures...`);

  for (const venture of allVentures) {
    const text = `
      Venture: ${venture.name}
      Domain: ${venture.domain}
      Status: ${venture.status}
      One-liner: ${venture.oneLiner || 'N/A'}
      Primary Focus: ${venture.primaryFocus || 'N/A'}
      Notes: ${venture.notes || 'N/A'}
    `.trim();

    const embedding = await generateEmbedding(text);

    await index.upsert([
      {
        id: `venture-${venture.id}`,
        values: embedding,
        metadata: {
          entityType: 'venture',
          entityId: venture.id,
          title: venture.name,
          content: text,
          domain: venture.domain,
          status: venture.status,
          createdAt: new Date(venture.createdAt).toISOString(),
        },
      },
    ]);
  }

  console.log(`✅ Indexed ${allVentures.length} ventures`);
}

/**
 * Index all projects
 */
async function indexProjects() {
  const allProjects = await db.select().from(projects);
  const index = await getIndex();

  console.log(`Indexing ${allProjects.length} projects...`);

  for (const project of allProjects) {
    const text = `
      Project: ${project.name}
      Status: ${project.status}
      Category: ${project.category}
      Priority: ${project.priority}
      Outcome: ${project.outcome || 'N/A'}
      Notes: ${project.notes || 'N/A'}
      Budget: ${project.budget || 0} | Spent: ${project.budgetSpent || 0}
    `.trim();

    const embedding = await generateEmbedding(text);

    await index.upsert([
      {
        id: `project-${project.id}`,
        values: embedding,
        metadata: {
          entityType: 'project',
          entityId: project.id,
          title: project.name,
          content: text,
          ventureId: project.ventureId || '',
          status: project.status,
          category: project.category,
          createdAt: new Date(project.createdAt).toISOString(),
        },
      },
    ]);
  }

  console.log(`✅ Indexed ${allProjects.length} projects`);
}

/**
 * Index all milestones
 */
async function indexMilestones() {
  const allMilestones = await db.select().from(milestones);
  const index = await getIndex();

  console.log(`Indexing ${allMilestones.length} milestones...`);

  for (const milestone of allMilestones) {
    const text = `
      Milestone: ${milestone.name}
      Status: ${milestone.status}
      Notes: ${milestone.notes || 'N/A'}
    `.trim();

    const embedding = await generateEmbedding(text);

    await index.upsert([
      {
        id: `milestone-${milestone.id}`,
        values: embedding,
        metadata: {
          entityType: 'milestone',
          entityId: milestone.id,
          title: milestone.name,
          content: text,
          projectId: milestone.projectId,
          status: milestone.status,
          createdAt: new Date(milestone.createdAt).toISOString(),
        },
      },
    ]);
  }

  console.log(`✅ Indexed ${allMilestones.length} milestones`);
}

/**
 * Index all tasks
 */
async function indexTasks() {
  const allTasks = await db.select().from(tasks);
  const index = await getIndex();

  console.log(`Indexing ${allTasks.length} tasks...`);

  for (const task of allTasks) {
    const text = `
      Task: ${task.title}
      Status: ${task.status}
      Priority: ${task.priority || 'N/A'}
      Type: ${task.type}
      Domain: ${task.domain}
      Notes: ${task.notes || 'N/A'}
    `.trim();

    const embedding = await generateEmbedding(text);

    await index.upsert([
      {
        id: `task-${task.id}`,
        values: embedding,
        metadata: {
          entityType: 'task',
          entityId: task.id,
          title: task.title,
          content: text,
          ventureId: task.ventureId || '',
          projectId: task.projectId || '',
          status: task.status,
          priority: task.priority || '',
          createdAt: new Date(task.createdAt).toISOString(),
        },
      },
    ]);
  }

  console.log(`✅ Indexed ${allTasks.length} tasks`);
}

/**
 * Index all capture items
 */
async function indexCaptures() {
  const allCaptures = await db.select().from(captureItems);
  const index = await getIndex();

  console.log(`Indexing ${allCaptures.length} captures...`);

  for (const capture of allCaptures) {
    const text = `
      Capture: ${capture.title}
      Type: ${capture.type}
      Source: ${capture.source}
      Domain: ${capture.domain}
      Notes: ${capture.notes || 'N/A'}
    `.trim();

    const embedding = await generateEmbedding(text);

    await index.upsert([
      {
        id: `capture-${capture.id}`,
        values: embedding,
        metadata: {
          entityType: 'capture',
          entityId: capture.id,
          title: capture.title,
          content: text,
          type: capture.type,
          clarified: capture.clarified,
          createdAt: new Date(capture.createdAt).toISOString(),
        },
      },
    ]);
  }

  console.log(`✅ Indexed ${allCaptures.length} captures`);
}

/**
 * Index all day logs (morning/evening reflections, outcomes, etc.)
 */
async function indexDays() {
  const allDays = await db.select().from(days);
  const index = await getIndex();

  console.log(`Indexing ${allDays.length} day logs...`);

  for (const day of allDays) {
    const text = `
      Date: ${day.date}
      Title: ${day.title || 'N/A'}
      Mood: ${day.mood || 'N/A'}
      Top 3 Outcomes: ${day.top3Outcomes || 'N/A'}
      One Thing to Ship: ${day.oneThingToShip || 'N/A'}
      Morning Reflection: ${day.reflectionAm || 'N/A'}
      Evening Reflection: ${day.reflectionPm || 'N/A'}
    `.trim();

    const embedding = await generateEmbedding(text);

    await index.upsert([
      {
        id: `day-${day.id}`,
        values: embedding,
        metadata: {
          entityType: 'day',
          entityId: day.id,
          title: `Day log: ${day.date}`,
          content: text,
          date: day.date,
          mood: day.mood || '',
          createdAt: new Date(day.createdAt).toISOString(),
        },
      },
    ]);
  }

  console.log(`✅ Indexed ${allDays.length} day logs`);
}

/**
 * Index all docs (SOPs, playbooks, specs, etc.)
 */
async function indexDocs() {
  const allDocs = await db.select().from(docs);
  const index = await getIndex();

  console.log(`Indexing ${allDocs.length} docs...`);

  for (const doc of allDocs) {
    const bodyText = doc.body || '';

    // For long docs, chunk them
    const chunks = bodyText.length > 2000 ? chunkText(bodyText) : [bodyText];

    for (let i = 0; i < chunks.length; i++) {
      const text = `
        Document: ${doc.title}
        Type: ${doc.type}
        Status: ${doc.status}
        Domain: ${doc.domain}
        ${chunks.length > 1 ? `Chunk ${i + 1}/${chunks.length}` : ''}
        Content: ${chunks[i]}
      `.trim();

      const embedding = await generateEmbedding(text);

      await index.upsert([
        {
          id: `doc-${doc.id}${chunks.length > 1 ? `-chunk-${i}` : ''}`,
          values: embedding,
          metadata: {
            entityType: 'doc',
            entityId: doc.id,
            title: doc.title,
            content: text,
            type: doc.type,
            status: doc.status,
            domain: doc.domain,
            chunkIndex: i,
            totalChunks: chunks.length,
            createdAt: new Date(doc.createdAt).toISOString(),
          },
        },
      ]);
    }
  }

  console.log(`✅ Indexed ${allDocs.length} docs`);
}

/**
 * Index a single entity (for real-time updates)
 */
export async function indexEntity(
  entityType: EntityType,
  entityId: string
) {
  console.log(`Indexing ${entityType}: ${entityId}`);

  switch (entityType) {
    case 'venture':
      await indexSingleVenture(entityId);
      break;
    case 'project':
      await indexSingleProject(entityId);
      break;
    case 'task':
      await indexSingleTask(entityId);
      break;
    case 'doc':
      await indexSingleDoc(entityId);
      break;
    // Add other entity types as needed
    default:
      console.warn(`Indexing for ${entityType} not implemented`);
  }
}

/**
 * Delete an entity from the index
 */
export async function deleteFromIndex(entityType: EntityType, entityId: string) {
  const index = await getIndex();
  const vectorId = `${entityType}-${entityId}`;

  await index.deleteOne(vectorId);
  console.log(`Deleted ${vectorId} from index`);
}

// Helper functions for indexing single entities
async function indexSingleVenture(id: string) {
  const [venture] = await db.select().from(ventures).where(eq(ventures.id, id));
  if (!venture) return;

  const text = `
    Venture: ${venture.name}
    Domain: ${venture.domain}
    Status: ${venture.status}
    One-liner: ${venture.oneLiner || 'N/A'}
    Primary Focus: ${venture.primaryFocus || 'N/A'}
    Notes: ${venture.notes || 'N/A'}
  `.trim();

  const embedding = await generateEmbedding(text);
  const index = await getIndex();

  await index.upsert([
    {
      id: `venture-${venture.id}`,
      values: embedding,
      metadata: {
        entityType: 'venture',
        entityId: venture.id,
        title: venture.name,
        content: text,
        domain: venture.domain,
        status: venture.status,
        createdAt: new Date(venture.createdAt).toISOString(),
      },
    },
  ]);
}

async function indexSingleProject(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return;

  const text = `
    Project: ${project.name}
    Status: ${project.status}
    Category: ${project.category}
    Priority: ${project.priority}
    Outcome: ${project.outcome || 'N/A'}
    Notes: ${project.notes || 'N/A'}
  `.trim();

  const embedding = await generateEmbedding(text);
  const index = await getIndex();

  await index.upsert([
    {
      id: `project-${project.id}`,
      values: embedding,
      metadata: {
        entityType: 'project',
        entityId: project.id,
        title: project.name,
        content: text,
        ventureId: project.ventureId || '',
        status: project.status,
        createdAt: new Date(project.createdAt).toISOString(),
      },
    },
  ]);
}

async function indexSingleTask(id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) return;

  const text = `
    Task: ${task.title}
    Status: ${task.status}
    Priority: ${task.priority || 'N/A'}
    Type: ${task.type}
    Notes: ${task.notes || 'N/A'}
  `.trim();

  const embedding = await generateEmbedding(text);
  const index = await getIndex();

  await index.upsert([
    {
      id: `task-${task.id}`,
      values: embedding,
      metadata: {
        entityType: 'task',
        entityId: task.id,
        title: task.title,
        content: text,
        status: task.status,
        priority: task.priority || '',
        createdAt: new Date(task.createdAt).toISOString(),
      },
    },
  ]);
}

async function indexSingleDoc(id: string) {
  const [doc] = await db.select().from(docs).where(eq(docs.id, id));
  if (!doc) return;

  const bodyText = doc.body || '';
  const chunks = bodyText.length > 2000 ? chunkText(bodyText) : [bodyText];
  const index = await getIndex();

  // Delete old chunks first
  await index.deleteMany({ entityType: 'doc', entityId: id });

  for (let i = 0; i < chunks.length; i++) {
    const text = `
      Document: ${doc.title}
      Type: ${doc.type}
      Content: ${chunks[i]}
    `.trim();

    const embedding = await generateEmbedding(text);

    await index.upsert([
      {
        id: `doc-${doc.id}${chunks.length > 1 ? `-chunk-${i}` : ''}`,
        values: embedding,
        metadata: {
          entityType: 'doc',
          entityId: doc.id,
          title: doc.title,
          content: text,
          type: doc.type,
          chunkIndex: i,
          totalChunks: chunks.length,
          createdAt: new Date(doc.createdAt).toISOString(),
        },
      },
    ]);
  }
}
