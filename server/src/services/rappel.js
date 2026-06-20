import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../config/rappel.js';
import { getUserById } from '../db/usersDb.js';
import { listCoursesByUser } from '../db/coursesDb.js';
import { listDueForReview } from '../db/topicMasteryDb.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHAT_MODEL = 'claude-haiku-4-5-20251001';

function buildUserContext(userId) {
  const user = getUserById(userId);
  const courses = listCoursesByUser(userId);
  const weakTopics = listDueForReview(userId, 5);

  const courseList = courses.length
    ? courses.map(c => `- ${c.name}`).join('\n')
    : 'No courses yet.';

  const weakList = weakTopics.length
    ? weakTopics.map(t => `- ${t.topic}`).join('\n')
    : 'None identified yet — keep taking quizzes!';

  return `Student name: ${user.display_name}
Enrolled courses:
${courseList}

Topics due for review (weakest first):
${weakList}`;
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

  await stream.finalMessage();
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();

  return fullText;
}
