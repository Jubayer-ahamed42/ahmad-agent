export class CodeExpert {
  constructor() {
    this.name = 'Senior Software & Web Development Expert';
  }

  // 1. Plan project architecture
  createArchitecturePlan(projectName, techStack = ['Next.js', 'Node.js', 'PostgreSQL']) {
    return {
      projectName,
      techStack,
      structure: [
        'src/app - Frontend pages & routing',
        'src/components - Reusable UI widgets & design system',
        'src/server - API controllers & business logic',
        'src/database - Schemas, migrations & ORM models',
        'tests/ - Unit and end-to-end integration tests'
      ],
      recommendations: [
        'Use TypeScript for strict type safety.',
        'Implement automated CI/CD checks before git commits.',
        'Use environment variables (.env) for database URLs and secrets.'
      ]
    };
  }

  // 2. Automated Code Review
  reviewCodeSnippet(codeString) {
    const issues = [];
    if (codeString.includes('var ')) {
      issues.push("Consider replacing 'var' with 'const' or 'let' for modern block scoping.");
    }
    if (codeString.includes('console.log(')) {
      issues.push("Ensure debug console.log statements are stripped in production builds.");
    }
    if (codeString.includes('password') || codeString.includes('secret')) {
      issues.push("Potential hardcoded credential detected. Move to .env file.");
    }

    return {
      passed: issues.length === 0,
      issuesCount: issues.length,
      suggestions: issues
    };
  }
}
