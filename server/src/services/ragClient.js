import dotenv from 'dotenv';
dotenv.config();

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Calls the FastAPI Python RAG microservice to retrieve matching document chunks.
 * @param {string} query The user question or situation description.
 * @param {number} k The number of chunks to retrieve (default: 3).
 * @returns {Promise<string>} The combined text context retrieved.
 */
export async function retrieveSopContext(query, k = 3) {
  try {
    const response = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, k }),
    });

    if (!response.ok) {
      console.warn(`RAG microservice returned status ${response.status}. Falling back to empty context.`);
      return '';
    }

    const data = await response.json();
    if (data && Array.isArray(data.chunks) && data.chunks.length > 0) {
      return data.chunks.join('\n\n---\n\n');
    }
    return '';
  } catch (error) {
    console.error('Error connecting to RAG microservice:', error.message);
    // Return empty context rather than crashing the whole API request
    return '';
  }
}
