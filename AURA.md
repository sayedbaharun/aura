# 🌟 Aura - Your AI Assistant

**Aura** is your personal AI assistant built into Hikma-OS. She has access to all your data (ventures, projects, tasks, health, nutrition, docs, reflections) and uses it to provide personalized insights and recommendations.

## 🎯 What Aura Can Do

- **Answer questions** about your ventures, projects, and tasks
- **Provide insights** from your health and productivity patterns
- **Recall information** from your documents and notes
- **Suggest actions** based on your goals and priorities
- **Identify trends** and correlations in your data
- **Help you plan** your day/week based on your commitments

## 🚀 Quick Start

### 1. Set Up Environment Variables

Make sure these are in your `.env` file:

```bash
# Required for Aura
OPENROUTER_API_KEY=sk-or-v1-your-key-here
PINECONE_API_KEY=pcsk_your-key-here
PINECONE_INDEX_NAME=hikma-os
```

### 2. Initialize Pinecone Index

Run this once to create your vector database:

```bash
npm run aura:init
```

### 3. Index Your Data

Index all your existing data into Pinecone:

```bash
npm run aura:index
```

This will:
- Convert all your ventures, projects, tasks, docs, etc. into embeddings
- Store them in Pinecone for semantic search
- Usually takes 2-5 minutes depending on how much data you have

### 4. Start Chatting!

1. Start your dev server: `npm run dev`
2. Open Hikma-OS in your browser
3. Look for the **purple sparkle button** in the bottom-right corner
4. Click it to open Aura's chat interface
5. Ask anything!

## 💬 Example Questions

Try asking Aura:

- "What should I work on today?"
- "How are my ventures doing?"
- "What patterns do you see in my health data?"
- "Which projects are at risk?"
- "What did I accomplish this week?"
- "Find all my SOPs about authentication"
- "When do I have the most energy?"
- "What's my average sleep time?"
- "Show me my P1 tasks for this week"

## 🏗️ How It Works (RAG Architecture)

1. **Your Question** → Converted to embedding vector
2. **Semantic Search** → Finds relevant context from your data in Pinecone
3. **Context + Question** → Sent to Claude Sonnet 3.5 via OpenRouter
4. **AI Response** → Streamed back to you in real-time

```
User Query
    ↓
[Generate Embedding]
    ↓
[Search Pinecone] → Top 5 relevant chunks
    ↓
[Build Prompt with Context]
    ↓
[Claude Sonnet 3.5] → Stream response
    ↓
User sees answer
```

## 📊 What Data Gets Indexed

Aura indexes ALL your Hikma-OS data:

- ✅ Ventures (name, domain, status, notes)
- ✅ Projects (name, outcome, budget, notes)
- ✅ Milestones (name, status, notes)
- ✅ Tasks (title, priority, status, notes)
- ✅ Capture Items (your inbox thoughts)
- ✅ Day Logs (morning/evening reflections)
- ✅ Health Entries (logs and notes)
- ✅ Nutrition Entries (meal logs)
- ✅ Docs (SOPs, playbooks, specs - full content)

## 🔄 Keeping Index Updated

### Automatic (Recommended)

Future enhancement: Webhook to auto-index when data changes.

### Manual

Re-run indexing anytime:

```bash
npm run aura:index
```

### Single Entity

Index a specific item via API:

```bash
POST /api/aura/index/task/task-id-here
POST /api/aura/index/doc/doc-id-here
```

## 🎨 Chat Features

- **Streaming Responses**: See Aura's answer appear in real-time
- **Conversation History**: Aura remembers the conversation context
- **Markdown Support**: Responses are formatted for readability
- **Suggested Questions**: Get ideas for what to ask (coming soon)
- **Source Citations**: See which data Aura used (coming soon)

## 🔧 Technical Details

### Stack

- **Vector DB**: Pinecone (free tier: 100k vectors)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **LLM**: Claude Sonnet 3.5 via OpenRouter
- **Framework**: Custom RAG pipeline

### API Endpoints

```bash
# Chat (non-streaming)
POST /api/aura/chat
Body: { message: "your question", history: [...] }

# Chat (streaming)
POST /api/aura/stream
Body: { message: "your question", history: [...] }

# Initialize index
POST /api/aura/init

# Index all data
POST /api/aura/index

# Index single entity
POST /api/aura/index/:entityType/:entityId

# Delete from index
DELETE /api/aura/index/:entityType/:entityId
```

### Files Structure

```
server/aura/
├── pinecone.ts       # Pinecone client & index management
├── embedding.ts      # OpenAI embedding generation
├── indexer.ts        # Index all data into Pinecone
└── chat.ts           # RAG chat logic & streaming

client/src/components/aura/
├── aura-chat.tsx         # Main chat interface
└── aura-chat-button.tsx  # Floating button

scripts/
└── index-aura.ts     # CLI script for indexing
```

## 💰 Cost Estimate

**Monthly costs for moderate usage (100 queries/day):**

| Component | Service | Cost |
|-----------|---------|------|
| Vector DB | Pinecone Free | $0 |
| Embeddings | OpenAI via OpenRouter | ~$2 |
| LLM Calls | Claude Sonnet via OpenRouter | ~$8-12 |
| **Total** | | **~$10-15/month** |

## 🔒 Privacy & Security

- Your data is sent to OpenRouter/OpenAI for embeddings and chat
- Anthropic (Claude) and OpenAI DO NOT train on API data
- All data transmission is encrypted (HTTPS)
- Pinecone stores vectors (not raw text) in their cloud
- Consider encrypting sensitive data before indexing

## 🐛 Troubleshooting

### "PINECONE_API_KEY is not set"
→ Add your Pinecone API key to `.env`

### "Failed to generate embedding"
→ Check your OPENROUTER_API_KEY is valid

### "No relevant context found"
→ Run `npm run aura:index` to index your data

### Aura gives irrelevant answers
→ Try rephrasing your question more specifically

### Chat button not appearing
→ Check browser console for errors, ensure AuraChatButton is in Layout

## 🚀 Future Enhancements

- [ ] **Auto-indexing**: Automatically update index when data changes
- [ ] **Source citations**: Show which docs/tasks Aura referenced
- [ ] **Suggested questions**: Smart follow-up questions
- [ ] **Voice input**: Talk to Aura instead of typing
- [ ] **Proactive insights**: Daily digest of patterns and recommendations
- [ ] **Multi-modal**: Upload images and ask questions about them
- [ ] **Custom agents**: Specialized agents for health, productivity, etc.

## 🎯 Best Practices

1. **Be specific**: "What are my P1 tasks for SaaS venture?" vs "What should I do?"
2. **Ask for patterns**: "What patterns do you see in..." triggers deeper analysis
3. **Reference time**: "this week", "last month", "recently" helps Aura focus
4. **Request actions**: "Suggest 3 tasks for tomorrow" gets actionable advice
5. **Re-index regularly**: Run `npm run aura:index` weekly if you have lots of updates

## 📝 Examples in Action

### Morning Planning
```
You: "What should I focus on today?"

Aura: "Based on your data:

1. **Top Priority**: You have 3 P0 tasks in your SaaS venture that are overdue
2. **Scheduled**: You planned deep work from 9-11am on the landing page redesign
3. **Health**: You've completed morning rituals 0/5 times this week - consider starting with that

I'd recommend:
- 9am: Morning ritual (15 min)
- 9:30am: Tackle the P0 bug fix (est 2 hours)
- 11:30am: Landing page redesign (deep work block)
```

### Health Insights
```
You: "Why am I so tired lately?"

Aura: "Looking at your health data from the past 2 weeks:

- **Sleep**: Average 5.2 hrs/night (vs your 7hr goal) ⚠️
- **Workouts**: Only 2 days this week (usually 5/week)
- **Pattern**: On days with <6hrs sleep, your productivity drops 40%

Strong correlation between sleep + workouts and your energy levels. Consider:
1. Set a 11pm bedtime alarm
2. Morning workout before deep work
3. You have highest energy 9-11am - use it wisely
```

---

**Built with 💜 by Aura for Hikma-OS**

Have questions? The code is well-documented - check the source files!
