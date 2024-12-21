import { createClient } from "@deepgram/sdk";
import { promises as fs } from 'fs';
import path from 'path';

// Replace with your actual Deepgram API key

async function transcribeAudio(audioFilePath) {
	try {
		// Initialize the Deepgram SDK
		const deepgram = createClient('d59640dea7cc83edac1dec3f4b9904feb05178e7');

		// Read the audio file
		const audioFile = await fs.readFile(audioFilePath);

		// Set transcription options
		const options = {
			punctuate: true,
			model: 'general',
			language: 'en-US',
			utterances: true,
			model: 'nova-2',
			summarize: 'v2',
			topics: true,
			intents: true,
			sentiment: true,
		};

		// Send the audio to Deepgram for transcription
		const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioFile, options);

		// Check for errors in the response
		if (error) {
			throw new Error(`Deepgram API Error: ${error.message}`);
		}

		if (!result || !result.results) {
			throw new Error('No results returned from Deepgram');
		}

		const transcript = result.results.channels[0].alternatives[0].transcript;

		// Create output filename based on input audio file
		const outputPath = path.join(
			path.dirname(audioFilePath),
			`${path.basename(audioFilePath, path.extname(audioFilePath))}_transcript.json`
		);

		// Save transcript to JSON file
		const transcriptData = {
			timestamp: new Date().toISOString(),
			audioFile: audioFilePath,
			transcript: transcript,
			result
		};

		await fs.writeFile(outputPath, JSON.stringify(transcriptData, null, 2));
		console.log('Transcription saved to:', outputPath);

		return transcript;

	} catch (error) {
		console.error('Error during transcription:', error);
		throw error;
	}
}

// Example usage
transcribeAudio('./testThap.mp3')
	.then(transcript => console.log('Transcript:', transcript))
	.catch(error => console.error('Error:', error));
