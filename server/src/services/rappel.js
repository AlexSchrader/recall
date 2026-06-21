import { SYSTEM_PROMPT } from '../config/rappel.js';
import { client } from './claude.js';
import { getUserById } from '../db/usersDb.js';
import { listCoursesByUser } from '../db/coursesDb.js';
import { listMasteryByUser } from '../db/topicMasteryDb.js';
import { listWeakQuestions } from '../db/attemptsDb.js';
import { logUsage } from '../db/usageLogDb.js';

const CHAT_MODEL = 'claude-haiku-4-5-20251001';

function pct(n) { return Math.round(n * 100); }

function buildUserContext(userId) {
  const user = getUserById(userId);
  const courses = listCoursesByUser(userId);
  const allMastery = listMasteryByUser(userId);
  const weakQuestions = listWeakQuestions(userId, 5);

  const courseList = courses.length
    ? courses.map(c => `- ${c.name}`).join('\n')
    : 'No courses yet.';

  const weakTopics = allMastery.filter(t => t.mastery < 0.6).slice(0, 8);
  const weakList = weakTopics.length
    ? weakTopics.map(t => `- ${t.topic} (mastery ${pct(t.mastery)}%)`).join('\n')
    : 'None identified yet — keep taking quizzes!';

  const missedList = weakQuestions.length
    ? weakQuestions.map(q => `- "${q.prompt.slice(0, 80)}" (missed ${q.miss_count}×, topic: ${q.topic})`).join('\n')
    : 'None yet.';

  return `Student name: ${user.display_name}
Enrolled courses:
${courseList}

Weak topics (mastery < 60%, lowest first):
${weakList}

Most commonly missed questions:
${missedList}

Use this context to proactively reference topics the student struggles with. If they seem stuck, connect it to a known weak topic.`;
}

export async function generateThreadTitle(firstMessage) {
  try {
    const response = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 16,
      messages: [{
        role: 'user',
        content: `Write a 4-6 word title for a tutoring chat that starts with: "${firstMessage.slice(0, 200)}"\nRespond with ONLY the title, no punctuation, no quotes.`,
      }],
    });
    return response.content[0]?.text?.trim() ?? firstMessage.slice(0, 50);
  } catch {
    return firstMessage.slice(0, 50);
  }
}

export async function streamRappelChat({ history, userId, res }) {
  const userContext = buildUserContext(userId);
  const systemPrompt = SYSTEM_PROMPT.replace('{{USER_CONTEXT}}', userContext);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = client.messages.stream({
    model: CHAT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: history,
  });

  let fullText = '';

  stream.on('text', (chunk) => {
    fullText += chunk;
    res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
  });

  const final = await stream.finalMessage();
  logUsage({
    userId,
    feature: 'chat',
    model: CHAT_MODEL,
    inputTokens:  final.usage?.input_tokens  ?? 0,
    outputTokens: final.usage?.output_tokens ?? 0,
  });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();

  return fullText;
}
