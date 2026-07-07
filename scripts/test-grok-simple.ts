#!/usr/bin/env node
import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
});

async function test() {
  console.log('Testing Grok API...');
  try {
    const { text } = await generateText({
      model: xai('grok-2-1212'),
      prompt: 'Say "Hello from Grok!" in Romanian.',
      maxTokens: 50,
    });
    console.log('✅ Grok response:', text);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
