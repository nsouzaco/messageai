# Project Brief: Aligna with AI Features

## Project Name
**Aligna** (formerly MessageAI)

## Mission
Transform Aligna from a messaging MVP into an AI-powered team collaboration tool for remote professionals, solving pain points like thread overload, missing important messages, context switching, and time zone coordination.

## Core Objectives

### Phase 1 (COMPLETE)
Build a WhatsApp/Slack-level reliable messaging app with:
- Real-time messaging (1-on-1 and group)
- Thread support in group chats
- Read receipts and presence indicators
- Optimistic UI
- Offline persistence

### Phase 2 (CURRENT)
Add AI-powered features to enhance team productivity:
1. **Thread Summarization** - Auto-generate concise summaries of long threads
2. **Action Item Extraction** - Auto-detect and extract tasks from conversations
3. **Smart Search** - Semantic search using embeddings and RAG
4. **Priority Message Detection** - Auto-flag urgent/important messages
5. **Decision Tracking** - Auto-detect and log decisions
6. **Proactive Assistant** - Time zone coordination and scheduling suggestions

## Target Users
- Remote team professionals (software engineers, designers, PMs)
- Distributed teams across time zones
- Teams drowning in Slack/Teams thread overload

## Success Criteria
- Thread summary generation < 5 seconds
- Search query response < 2 seconds
- Priority detection < 1 second (async)
- Action item extraction > 80% precision
- Priority detection > 70% accuracy
- Decision detection > 75% accuracy

## Technical Approach
- **Frontend**: React Native + Expo
- **Backend**: Firebase (Firestore, Auth, Storage, Realtime DB)
- **AI Backend**: Firebase Cloud Functions + OpenAI
- **Vector DB**: Pinecone (or Firebase Vector Search)
- **AI Models**: GPT-4 for summaries/analysis, text-embedding-3-small for search

## Key Constraints
- Must maintain MVP performance and reliability
- Keep within Firebase free tier where possible
- No PII sent to OpenAI
- User consent for AI processing required
- Secure API key management (server-side only)

