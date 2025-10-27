/**
 * Centralized Prompt Templates
 * All AI prompts for consistency and easy iteration
 */

interface Message {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

/**
 * Thread Summarization Prompt
 */
export function buildThreadSummaryPrompt(
  messages: Message[],
  context?: { conversationName?: string; threadTopic?: string }
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemPrompt = `You are an AI assistant that summarizes work conversation threads.
Your goal is to help remote teams catch up quickly on long discussions.

Guidelines:
- Be concise and professional
- Focus on key points and decisions
- Use bullet points for clarity
- Identify action items if any
- Don't include greetings or small talk`;

  const messagesText = messages
    .map((m) => {
      const date = new Date(m.timestamp).toLocaleString();
      return `[${date}] ${m.senderName}: ${m.text}`;
    })
    .join('\n');

  const contextText = context?.conversationName
    ? `Conversation: ${context.conversationName}\n`
    : '';
  const topicText = context?.threadTopic
    ? `Thread topic: ${context.threadTopic}\n`
    : '';

  const userPrompt = `${contextText}${topicText}
Thread conversation (${messages.length} messages):

${messagesText}

Please provide:
1. Main topic (one sentence)
2. Key points (3-5 bullet points)
3. Decisions made (if any)
4. Action items (if any)

Keep it concise and actionable.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Action Item Extraction Prompt
 */
export function buildActionItemPrompt(
  messages: Message[]
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemPrompt = `You are an AI assistant that extracts action items from work conversations.

Guidelines:
- Only identify clear, actionable tasks
- Extract the assignee if mentioned
- Extract deadline if mentioned
- Be conservative - only flag obvious action items
- Return in JSON format`;

  const messagesText = messages
    .map((m) => `${m.senderName}: ${m.text}`)
    .join('\n');

  const userPrompt = `Analyze this conversation and extract action items:

${messagesText}

Return a JSON array of action items in this format:
[
  {
    "task": "Description of the task",
    "assignee": "Person's name or null",
    "deadline": "Deadline if mentioned or null",
    "confidence": 0.0-1.0
  }
]

If no action items, return an empty array: []`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Priority Detection Prompt
 */
export function buildPriorityPrompt(
  message: Message,
  context?: { hasMentions?: boolean; senderRole?: string }
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemPrompt = `You are an AI assistant that classifies message priority for remote teams.

Priority levels:
- HIGH: Urgent, time-sensitive, blockers, critical decisions
- MEDIUM: Important but not urgent, questions needing answers
- LOW: FYI, updates, casual conversation

Consider:
- Urgency keywords (urgent, ASAP, immediately, critical)
- Questions that need answers
- Blockers or issues
- Mentions (but not all mentions are high priority)
- Deadlines
- Tone and sentiment`;

  const mentionContext = context?.hasMentions ? '\n(Note: This message mentions someone)' : '';

  const userPrompt = `Classify the priority of this message:

From: ${message.senderName}
Message: "${message.text}"${mentionContext}

Return a JSON object:
{
  "priority": "high" | "medium" | "low",
  "score": 0-100,
  "reasons": ["reason1", "reason2"]
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Decision Detection Prompt
 */
export function buildDecisionPrompt(
  messages: Message[]
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemPrompt = `You are an AI assistant that identifies decisions made in work conversations.

Decision indicators:
- "Let's go with..."
- "We decided to..."
- "The plan is..."
- "We'll do..."
- Consensus reached after discussion

Guidelines:
- Only flag clear decisions, not opinions
- Extract what was decided
- Identify who participated
- Return empty if no clear decision`;

  const messagesText = messages
    .map((m) => `${m.senderName}: ${m.text}`)
    .join('\n');

  const userPrompt = `Analyze this conversation for decisions:

${messagesText}

Return JSON:
{
  "hasDecision": true/false,
  "decision": "What was decided",
  "participants": ["name1", "name2"],
  "confidence": 0.0-1.0
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Scheduling Intent Detection Prompt
 */
export function buildSchedulingPrompt(
  messages: Message[]
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemPrompt = `You are an AI assistant that detects scheduling intent in conversations.

Scheduling indicators:
- "Let's meet..."
- "When can we sync?"
- "Schedule a call"
- "Are you free..."
- "What time works?"

Guidelines:
- Detect intent to schedule
- Extract participants
- Extract time preferences if mentioned
- Return null if no scheduling intent`;

  const messagesText = messages
    .map((m) => `${m.senderName}: ${m.text}`)
    .join('\n');

  const userPrompt = `Analyze this conversation for scheduling intent:

${messagesText}

Return JSON:
{
  "hasSchedulingIntent": true/false,
  "participants": ["name1", "name2"],
  "timePreferences": "Any mentioned preferences or null",
  "confidence": 0.0-1.0
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}


