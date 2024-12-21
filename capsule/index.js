import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import { createClient } from '@deepgram/sdk';
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';
import { analyzeTranscript } from './aiAnalysis.mjs';
import { authenticateToken } from './middleware/auth.js';
import cors from 'cors';

// Configuration
const app = express();

// CORS configuration
app.use(
  cors({
    origin: '*', // Add your frontend URLs
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json()); // Add JSON parsing middleware
const port = process.env.PORT || 3000;
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION, // Replace with your bucket's region, e.g., 'us-east-1'
});
const deepgram = createClient(process.env.DEEPGRAM_API_KEY); // Replace with your Deepgram API key
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // PostgreSQL connection string
  ssl: { rejectUnauthorized: false }, // Configure SSL for production
});

const upload = multer({ storage: multer.memoryStorage() }); // Multer for file uploads

// Add authentication middleware for all routes
app.use(authenticateToken);

// S3 Bucket details
const bucketName = 'zillusion-capsule-audio-s3'; // Replace with your bucket name

const generatePresignedUrl = (bucketName, s3Key, extension) => {
  const params = {
    Bucket: bucketName, // Your S3 bucket name
    Key: s3Key, // The file's S3 key
    Expires: 60 * 60, // URL expiration time in seconds (60 minutes in this case)
  };

  // Generate the pre-signed URL
  const url = s3.getSignedUrl('getObject', params);
  return url;
};

// Endpoint for audio upload and transcription
app.post('/UploadAndTranscribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioFile = req.file;
    const fileId = uuidv4();
    const userId = req.userId; // Get user ID from the authenticated request

    // Get file extension from mimetype
    const extension = audioFile.mimetype.split('/')[1];
    const s3Key = `audio/${fileId}.${extension}`;

    // Upload audio to S3
    const s3Params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: audioFile.buffer,
      ContentType: audioFile.mimetype,
    };
    const s3UploadResponse = await s3.upload(s3Params).promise();
    const audioUrl = generatePresignedUrl(
      s3UploadResponse.Bucket,
      s3UploadResponse.Key
    );

    // Now, use this S3 URL for Deepgram transcription
    const options = {
      punctuate: true,
      model: 'nova-2',
      language: 'en-US',
      utterances: true,
      summarize: 'v2',
      topics: true,
      intents: true,
      sentiment: true,
      diarize: true
    };

    // Transcribe audio using Deepgram API
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      options
    );

    // Check for errors in the response
    if (error) {
      throw new Error(`Deepgram API Error: ${error.message}`);
    }

    if (!result || !result.results) {
      throw new Error('Deepgram transcription failed');
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;

    // Save data to PostgreSQL with user ID
    const query = `
      INSERT INTO transcriptions (id, extension, transcription, metadata, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `;
    const values = [fileId, extension, transcript, result, userId];
    const dbResponse = await pool.query(query, values);

    res.status(200).json({
      message: 'Transcription successful',
      id: dbResponse.rows[0].id,
    });
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .json({ error: 'An error occurred', details: error.message });
  }
});

// Endpoint for audio upload and transcription
app.post('/startTranscription', async (req, res) => {
  try {
    const { key } = req.body;
    const userId = req.userId; // Get user ID from the authenticated request
    const audioUrl = generatePresignedUrl(bucketName, key);
    const id = uuidv4();

    // Now, use this S3 URL for Deepgram transcription
    const options = {
      punctuate: true,
      model: 'nova-2',
      language: 'en-US',
      utterances: true,
      summarize: 'v2',
      topics: true,
      intents: true,
      sentiment: true,
      diarize: true
    };

    // Transcribe audio using Deepgram API
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      options
    );

    // Check for errors in the response
    if (error) {
      throw new Error(`Deepgram API Error: ${error.message}`);
    }

    if (!result || !result.results) {
      throw new Error('Deepgram transcription failed');
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;

    // Save data to PostgreSQL with user ID
    const query = `
      INSERT INTO transcriptions (id, extension, transcription, metadata, filename, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [id, 'm4a', transcript, result, key, userId];
    const dbResponse = await pool.query(query, values);

    res.status(200).json({
      message: 'Transcription successful',
      id: dbResponse.rows[0].id,
    });

    const analysis = await analyzeTranscript(result);

    const updateQuery = `
      UPDATE transcriptions
      SET analysis = $1
      WHERE id = $2;
    `;
    const updateValues = [analysis, id];
    await pool.query(updateQuery, updateValues);

    console.log('successfully Analyzed');
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .json({ error: 'An error occurred', details: error.message });
  }
});

app.get('/transcription/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Special handling for demo transcription
    if (id === '5ebfb8fa-f567-4357-bfbd-4d0691cd4770') {
      const query = 'SELECT * FROM transcriptions WHERE id = $1';
      const dbResponse = await pool.query(query, [id]);
      if (dbResponse.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }
      const extension = dbResponse.rows[0].extension;
      const s3Key = `audio/${id}.${extension}`;
      return res.status(200).json({
        ...dbResponse.rows[0],
        demo: true,
        audioUrl: generatePresignedUrl(bucketName, s3Key),
      });
    }

    // Regular transcription handling with user ID check
    const query = 'SELECT * FROM transcriptions WHERE id = $1 AND user_id = $2';
    const dbResponse = await pool.query(query, [id, userId]);

    if (dbResponse.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    const extension = dbResponse.rows[0].extension;
    const s3Key = `audio/${id}.${extension}`;

    res.status(200).json({
      ...dbResponse.rows[0],
      audioUrl: generatePresignedUrl(bucketName, s3Key),
    });
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .json({ error: 'An error occurred', details: error.message });
  }
});

app.get('/transcription/v2/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Special handling for demo transcription
    if (id === '5ebfb8fa-f567-4357-bfbd-4d0691cd4770') {
      const query = 'SELECT * FROM transcriptions WHERE id = $1';
      const dbResponse = await pool.query(query, [id]);

      console.log(dbResponse.rows);

      if (dbResponse.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }
      const filename = dbResponse.rows[0].filename;
      return res.status(200).json({
        ...dbResponse.rows[0],
        demo: true,
        audioUrl: generatePresignedUrl(bucketName, filename),
      });
    }

    // Regular transcription handling with user ID check
    const query = 'SELECT * FROM transcriptions WHERE id = $1 AND user_id = $2';
    const dbResponse = await pool.query(query, [id, userId]);

    console.log(dbResponse.rows);

    if (dbResponse.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    const filename = dbResponse.rows[0].filename;
    res.status(200).json({
      ...dbResponse.rows[0],
      audioUrl: generatePresignedUrl(bucketName, filename),
    });
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .json({ error: 'An error occurred', details: error.message });
  }
});

// Endpoint for paginated transcriptions
app.get('/transcriptionList', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const userId = req.userId;

    // If it's the first page, we'll add the demo transcription
    if (page === 1) {
      // Get the demo transcription
      const demoQuery = 'SELECT * FROM transcriptions WHERE id = $1';
      const demoResult = await pool.query(demoQuery, ['5ebfb8fa-f567-4357-bfbd-4d0691cd4770']);
      
      // Adjust the limit to account for the demo transcription
      limit = limit - 1;
      const offset = (page - 1) * limit;

      // Get user's transcriptions count
      const countQuery = 'SELECT COUNT(*) FROM transcriptions WHERE user_id = $1';
      const countResult = await pool.query(countQuery, [userId]);
      const totalItems = parseInt(countResult.rows[0].count);

      // Get user's transcriptions
      const query = `
        SELECT 
          id, 
          filename,
          metadata,
          transcription
        FROM transcriptions 
        WHERE user_id = $1
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const dbResponse = await pool.query(query, [userId, limit, offset]);

      // Combine demo and user transcriptions
      const allTranscriptions = demoResult.rows.length > 0 
        ? [
            {
              ...demoResult.rows[0],
              demo: true,
              text: demoResult.rows[0].metadata?.results?.summary?.short || demoResult.rows[0].transcription,
              filename: demoResult.rows[0].filename,
              duration: demoResult.rows[0].metadata?.metadata?.duration || 0
            },
            ...dbResponse.rows.map(transcription => ({
              id: transcription.id,
              text: transcription.metadata?.results?.summary?.short || transcription.transcription,
              filename: transcription.filename,
              duration: transcription.metadata?.metadata?.duration || 0
            }))
          ]
        : dbResponse.rows.map(transcription => ({
            id: transcription.id,
            text: transcription.metadata?.results?.summary?.short || transcription.transcription,
            filename: transcription.filename,
            duration: transcription.metadata?.metadata?.duration || 0
          }));

      return res.json({
        data: allTranscriptions,
        pagination: {
          currentPage: page,
          itemsPerPage: limit + 1, // Add 1 to account for demo transcription
          totalItems: totalItems + 1, // Add 1 to account for demo transcription
          totalPages: Math.ceil((totalItems + 1) / (limit + 1)),
        },
      });
    } else {
      // Regular pagination without demo transcription
      const offset = (page - 1) * limit;
      
      // Get total count for pagination info
      const countQuery = 'SELECT COUNT(*) FROM transcriptions WHERE user_id = $1';
      const countResult = await pool.query(countQuery, [userId]);
      const totalItems = parseInt(countResult.rows[0].count);

      // Fetch paginated transcriptions
      const query = `
        SELECT 
          id, 
          filename,
          metadata,
          transcription
        FROM transcriptions 
        WHERE user_id = $1
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const dbResponse = await pool.query(query, [userId, limit, offset]);

      const transcriptionsWithUrls = dbResponse.rows.map((transcription) => ({
        id: transcription.id,
        text: transcription.metadata?.results?.summary?.short || transcription.transcription,
        filename: transcription.filename,
        duration: transcription.metadata?.metadata?.duration || 0
      }));

      res.json({
        data: transcriptionsWithUrls,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: totalItems + 1, // Add 1 to account for demo transcription
          totalPages: Math.ceil((totalItems + 1) / limit),
        },
      });
    }
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
