import { Client } from '@elastic/elasticsearch';

const esUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: esUrl,
  maxRetries: 1,
  requestTimeout: 2000,
});

export const EMAILS_INDEX = 'emails';

export async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            isStarred: { type: 'boolean' },
            attachments: { type: 'text' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(` Elasticsearch index '${EMAILS_INDEX}' created successfully`);
    } else {
      console.log(` Elasticsearch index '${EMAILS_INDEX}' already exists`);
    }
  } catch (error) {
    console.warn(' Elasticsearch connection warning (indexing will fallback silently if ES is offline):', (error as Error).message);
  }
}
