import OpenAI from 'openai';
import dotenv from 'dotenv';

// import transcriptJSON from './testThap_transcript_new.json' assert { type: 'json' };

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.AI_KEY,
});

async function analyzeTranscript(result) {
  let transcript = '';
  result.results.utterances.forEach((utterance, index) => {
    transcript += `Speaker ${utterance.channel}\n${utterance.transcript}\n\n`; // Format each utterance
  });

  console.log(transcript);

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that analyzes audio transcripts.',
        },
        {
          role: 'user',
          content: `${process.env.PROMPT}
    ${transcript}`,
        },
      ],
      model: 'gpt-4o-mini',
    });

    const analysis = completion.choices[0].message.content;
    console.log(analysis);
    return analysis.replace(/```json|```/g, '').trim();
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Example usage

const dummyTranscript =
  'This is a sample transcript that needs to be analyzed.';
analyzeTranscript(dummyTranscript)
  .then((analysis) =>
    console.log('Analysis:', analysis.replace(/```json|```/g, '').trim())
  )
  .catch((error) => console.error('Error:', error));

console.log(dummyTranscript);

export { analyzeTranscript };
