// Skeleton (Phase 1). Workstream H owns and completes this in Phase 3 (budgets, more URLs).
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['/index.html'],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
