// Canonical skill/keyword -> alternative spellings that should count as the same thing.
// Used to pull keywords out of job descriptions and to check whether a CV mentions them.

export const skillDictionary = {
  // Languages
  javascript: ['js', 'es6', 'ecmascript'],
  typescript: ['ts'],
  python: [],
  java: [],
  'c++': ['cpp'],
  'c#': ['csharp', '.net', 'dotnet'],
  c: [],
  go: ['golang'],
  rust: [],
  kotlin: [],
  swift: [],
  php: [],
  ruby: [],
  r: [],
  sql: ['mysql', 'sql server', 't-sql', 'pl/sql'],
  bash: ['shell scripting', 'shell'],
  html: ['html5'],
  css: ['css3', 'scss', 'sass'],

  // Frontend
  react: ['react.js', 'reactjs'],
  'next.js': ['nextjs', 'next'],
  angular: ['angularjs'],
  vue: ['vue.js', 'vuejs'],
  redux: ['redux toolkit', 'zustand'],
  tailwind: ['tailwind css', 'tailwindcss'],
  bootstrap: [],
  vite: [],
  'responsive design': ['responsive', 'mobile-first'],
  accessibility: ['a11y', 'wcag'],
  'performance optimization': ['web performance', 'lighthouse', 'core web vitals'],

  // Backend
  'node.js': ['node', 'nodejs'],
  express: ['express.js', 'expressjs'],
  django: [],
  flask: [],
  fastapi: [],
  'spring boot': ['spring'],
  'rest api': ['rest', 'restful', 'rest apis', 'api development', 'apis'],
  graphql: [],
  microservices: ['microservice'],
  authentication: ['jwt', 'oauth', 'auth', 'authorization'],
  'socket.io': ['websockets', 'websocket', 'real-time'],
  stripe: ['payment gateway', 'razorpay', 'payments'],
  'system design': ['scalable systems', 'distributed systems'],

  // Databases
  mongodb: ['mongo', 'mongoose', 'nosql'],
  postgresql: ['postgres'],
  redis: [],
  firebase: ['firestore'],
  sqlite: [],
  dbms: ['database management', 'databases'],

  // DevOps / Cloud
  docker: ['containers', 'containerization'],
  kubernetes: ['k8s'],
  aws: ['amazon web services', 'ec2', 's3', 'lambda'],
  azure: [],
  gcp: ['google cloud'],
  'ci/cd': ['cicd', 'continuous integration', 'continuous deployment'],
  jenkins: [],
  'github actions': [],
  terraform: ['infrastructure as code', 'iac'],
  ansible: [],
  linux: ['unix', 'ubuntu'],
  nginx: [],
  monitoring: ['prometheus', 'grafana', 'observability'],
  git: ['github', 'gitlab', 'version control'],

  // Data / ML
  excel: ['ms excel', 'microsoft excel', 'spreadsheets', 'vlookup', 'pivot tables'],
  'power bi': ['powerbi'],
  tableau: [],
  pandas: [],
  numpy: [],
  matplotlib: ['seaborn', 'plotly'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  tensorflow: ['keras'],
  pytorch: ['torch'],
  'machine learning': ['ml'],
  'deep learning': ['neural networks', 'cnn', 'rnn'],
  nlp: ['natural language processing'],
  'computer vision': ['opencv', 'image processing'],
  llm: ['large language models', 'generative ai', 'genai', 'langchain', 'rag'],
  mlops: ['model deployment'],
  statistics: ['statistical analysis', 'hypothesis testing', 'probability'],
  'data visualization': ['visualization', 'dashboards', 'dashboard'],
  'data cleaning': ['data wrangling', 'data preprocessing'],
  'feature engineering': [],
  etl: ['data pipelines', 'data pipeline'],
  'a/b testing': ['ab testing', 'experimentation'],
  'google analytics': [],

  // CS fundamentals
  'data structures': ['dsa', 'data structures and algorithms'],
  algorithms: [],
  oop: ['object oriented programming', 'object-oriented'],
  'operating systems': ['os'],
  'computer networks': ['networking', 'tcp/ip'],
  'problem solving': ['problem-solving', 'competitive programming', 'leetcode', 'codeforces'],
  testing: ['unit testing', 'jest', 'mocha', 'pytest', 'cypress', 'selenium'],
  jest: [],

  // Mobile
  android: ['android studio'],
  flutter: ['dart'],
  'react native': [],
  'jetpack compose': [],
  mvvm: [],
  'play store': ['app store'],

  // Design
  figma: [],
  'adobe xd': [],
  'user research': ['user interviews'],
  wireframing: ['wireframes'],
  prototyping: ['prototypes'],
  'design systems': ['design system', 'component library'],
  'usability testing': [],
  'ui design': ['ui', 'user interface'],
  'interaction design': [],
  'information architecture': [],

  // Security
  'network security': [],
  'penetration testing': ['pentesting', 'ethical hacking'],
  owasp: [],
  wireshark: [],
  siem: ['splunk'],
  'vulnerability assessment': ['vapt'],
  'burp suite': [],
  nmap: [],
  metasploit: [],
  cryptography: ['encryption'],
  'incident response': [],
  'cloud security': [],

  // Soft / general
  communication: ['communication skills'],
  teamwork: ['collaboration', 'team player'],
  leadership: ['led a team', 'team lead'],
  agile: ['scrum', 'jira', 'kanban'],
  'time management': [],
  'project management': [],
  'microsoft office': ['ms office', 'word', 'powerpoint']
};

// Terms too ambiguous to pull out of a free-text JD on their own (they still count
// as matches when a role profile lists them explicitly).
export const AMBIGUOUS_TERMS = new Set(['c', 'r', 'go', 'ui', 'next', 'os', 'ts', 'js', 'shell', 'word', 'auth', 'rest', 'apis', 'node', 'mongo', 'spring', 'ml', 'torch', 'real-time', 'responsive', 'payments', 'databases', 'dashboard', 'dashboards', 'visualization', 'containers']);
