module.exports = {
  root: true,
  extends: ['@repo/config/eslint'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@repo/intelligence*'],
            message: 'API layers may not import intelligence modules.',
          },
          {
            group: ['@repo/scoring*'],
            message: 'Ingest layers may not import scoring modules.',
          },
          {
            group: ['@repo/enrichedListing', '@repo/types/enrichedListing'],
            message: 'RAW ingestion must not import enriched types.',
          },
          {
            group: ['@repo/enrichment*'],
            message: 'Pipeline ingestion must not import enrichment guardrails directly.',
          },
          {
            group: ['packages/types/src/enrichedListing'],
            message: 'RAW ingestion uses only raw contracts.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['api/src/**/webhooks/**', 'api/src/**/ingest/**', 'workers/src/**/pipeline/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: ['@repo/enrichedListing', '@repo/types/enrichedListing', 'packages/types/src/enrichedListing'],
          },
        ],
      },
    },
  ],
};
