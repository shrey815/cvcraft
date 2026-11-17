// Target job profiles. Each one drives: suggested section order, skills to show,
// keywords the ATS checker looks for when no job description is pasted, and tips.

const DEFAULT_ORDER = ['summary', 'education', 'skills', 'projects', 'experience', 'certifications', 'achievements', 'activities'];

export const roleProfiles = [
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    category: 'Software',
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'activities'],
    coreSkills: ['javascript', 'typescript', 'react', 'html', 'css', 'tailwind', 'git', 'rest api', 'responsive design'],
    niceToHave: ['next.js', 'redux', 'jest', 'figma', 'accessibility', 'performance optimization', 'vite', 'testing'],
    actionVerbs: ['Built', 'Designed', 'Implemented', 'Optimized', 'Refactored', 'Shipped', 'Improved'],
    tips: [
      'Put your strongest UI projects first and link the live demo.',
      'Mention measurable UI wins: load time, Lighthouse score, bundle size.',
      'Show component libraries, state management and responsive design work.'
    ]
  },
  {
    id: 'backend-developer',
    name: 'Backend Developer',
    category: 'Software',
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'activities'],
    coreSkills: ['node.js', 'express', 'rest api', 'sql', 'mongodb', 'authentication', 'git', 'java', 'python'],
    niceToHave: ['docker', 'redis', 'microservices', 'postgresql', 'aws', 'system design', 'graphql', 'testing'],
    actionVerbs: ['Architected', 'Built', 'Designed', 'Scaled', 'Optimized', 'Secured', 'Integrated'],
    tips: [
      'Describe APIs, data models and how you handled auth and errors.',
      'Quantify performance: response time, requests per second, query speedups.',
      'Mention databases and deployment, not just languages.'
    ]
  },
  {
    id: 'full-stack-developer',
    name: 'Full Stack Developer',
    category: 'Software',
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'activities'],
    coreSkills: ['javascript', 'react', 'node.js', 'express', 'mongodb', 'rest api', 'html', 'css', 'git'],
    niceToHave: ['typescript', 'next.js', 'docker', 'aws', 'redux', 'sql', 'socket.io', 'stripe', 'ci/cd'],
    actionVerbs: ['Developed', 'Built', 'Deployed', 'Integrated', 'Designed', 'Launched', 'Automated'],
    tips: [
      'Lead with 2-3 end-to-end projects that are deployed and linked.',
      'Name the full stack per project (e.g. MERN, Stripe, Socket.io).',
      'Show you handled both UI and backend concerns like auth and payments.'
    ]
  },
  {
    id: 'software-engineer',
    name: 'Software Engineer (SDE)',
    category: 'Software',
    sectionOrder: ['summary', 'education', 'skills', 'experience', 'projects', 'achievements', 'certifications', 'activities'],
    coreSkills: ['data structures', 'algorithms', 'java', 'c++', 'python', 'oop', 'sql', 'git', 'problem solving'],
    niceToHave: ['system design', 'operating systems', 'dbms', 'computer networks', 'linux', 'docker', 'testing'],
    actionVerbs: ['Engineered', 'Implemented', 'Designed', 'Optimized', 'Solved', 'Developed', 'Reduced'],
    tips: [
      'Show coding profiles and ratings (LeetCode, Codeforces, CodeChef) in achievements.',
      'Keep CGPA and core CS coursework visible in education.',
      'Mention complexity improvements in project bullets where relevant.'
    ]
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    category: 'Data',
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'activities'],
    coreSkills: ['sql', 'excel', 'python', 'power bi', 'tableau', 'pandas', 'data visualization', 'statistics', 'data cleaning'],
    niceToHave: ['numpy', 'matplotlib', 'dashboards', 'a/b testing', 'google analytics', 'etl', 'r'],
    actionVerbs: ['Analyzed', 'Visualized', 'Identified', 'Automated', 'Reported', 'Forecasted', 'Cleaned'],
    tips: [
      'Every project should state the dataset, the question and the insight found.',
      'Link dashboards (Tableau Public, Power BI) or notebooks.',
      'Quantify impact: hours saved, revenue insight, accuracy.'
    ]
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist / ML Engineer',
    category: 'Data',
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'activities'],
    coreSkills: ['python', 'machine learning', 'pandas', 'numpy', 'scikit-learn', 'statistics', 'sql', 'deep learning'],
    niceToHave: ['tensorflow', 'pytorch', 'nlp', 'computer vision', 'llm', 'mlops', 'feature engineering', 'docker'],
    actionVerbs: ['Trained', 'Modeled', 'Predicted', 'Engineered', 'Evaluated', 'Deployed', 'Improved'],
    tips: [
      'Report model metrics (accuracy, F1, RMSE) and the baseline you beat.',
      'Mention dataset size and how you handled data quality.',
      'Include research papers or Kaggle rankings in achievements.'
    ]
  },
  {
    id: 'devops-engineer',
    name: 'DevOps / Cloud Engineer',
    category: 'Infrastructure',
    sectionOrder: ['summary', 'skills', 'certifications', 'projects', 'experience', 'education', 'achievements', 'activities'],
    coreSkills: ['linux', 'docker', 'kubernetes', 'aws', 'ci/cd', 'git', 'bash', 'terraform'],
    niceToHave: ['azure', 'gcp', 'jenkins', 'github actions', 'monitoring', 'ansible', 'nginx', 'python'],
    actionVerbs: ['Automated', 'Provisioned', 'Containerized', 'Deployed', 'Monitored', 'Reduced', 'Migrated'],
    tips: [
      'Cloud certifications matter here, so place them high.',
      'Show pipelines you built and what they automated.',
      'Quantify uptime, deploy time or cost reductions.'
    ]
  },
  {
    id: 'ui-ux-designer',
    name: 'UI/UX Designer',
    category: 'Design',
    sectionOrder: ['summary', 'projects', 'skills', 'experience', 'education', 'certifications', 'achievements', 'activities'],
    coreSkills: ['figma', 'user research', 'wireframing', 'prototyping', 'design systems', 'usability testing', 'ui design'],
    niceToHave: ['adobe xd', 'html', 'css', 'accessibility', 'interaction design', 'information architecture'],
    actionVerbs: ['Designed', 'Researched', 'Prototyped', 'Tested', 'Redesigned', 'Led', 'Improved'],
    tips: [
      'A portfolio link is essential; put it in your header.',
      'Describe the problem, your process and the outcome per project.',
      'Mention user research and usability metrics.'
    ]
  },
  {
    id: 'android-developer',
    name: 'Mobile App Developer',
    category: 'Software',
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'activities'],
    coreSkills: ['kotlin', 'java', 'android', 'flutter', 'react native', 'firebase', 'rest api', 'git'],
    niceToHave: ['jetpack compose', 'swift', 'mvvm', 'sqlite', 'play store', 'testing'],
    actionVerbs: ['Developed', 'Published', 'Built', 'Optimized', 'Integrated', 'Designed'],
    tips: [
      'Link Play Store / App Store listings and mention downloads or ratings.',
      'Name the architecture (MVVM, clean architecture) you used.'
    ]
  },
  {
    id: 'cybersecurity-analyst',
    name: 'Cybersecurity Analyst',
    category: 'Infrastructure',
    sectionOrder: ['summary', 'skills', 'certifications', 'projects', 'experience', 'education', 'achievements', 'activities'],
    coreSkills: ['network security', 'linux', 'python', 'penetration testing', 'owasp', 'wireshark', 'siem', 'vulnerability assessment'],
    niceToHave: ['burp suite', 'nmap', 'metasploit', 'cryptography', 'incident response', 'cloud security'],
    actionVerbs: ['Assessed', 'Secured', 'Detected', 'Investigated', 'Hardened', 'Audited', 'Mitigated'],
    tips: [
      'Certifications (CEH, Security+) and CTF rankings carry weight.',
      'Describe vulnerabilities found and how they were fixed.'
    ]
  },
  {
    id: 'general',
    name: 'General / Other',
    category: 'General',
    sectionOrder: DEFAULT_ORDER,
    coreSkills: ['communication', 'teamwork', 'problem solving', 'microsoft office'],
    niceToHave: ['leadership', 'time management', 'project management'],
    actionVerbs: ['Led', 'Organized', 'Managed', 'Coordinated', 'Delivered', 'Improved'],
    tips: ['Tailor the summary to the job and keep the CV to one page as a student.']
  }
];

export const DEFAULT_SECTION_ORDER = DEFAULT_ORDER;

export function getRoleProfile(id) {
  return roleProfiles.find((r) => r.id === id) || roleProfiles.find((r) => r.id === 'general');
}
