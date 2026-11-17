// Proper display names for skill keywords (the API uses lowercase canonical keys).
const NAMES = {
  javascript: 'JavaScript', typescript: 'TypeScript', 'c++': 'C++', 'c#': 'C#', html: 'HTML', css: 'CSS', sql: 'SQL', php: 'PHP',
  react: 'React', 'next.js': 'Next.js', vue: 'Vue', 'node.js': 'Node.js', express: 'Express', mongodb: 'MongoDB', postgresql: 'PostgreSQL',
  'rest api': 'REST APIs', graphql: 'GraphQL', 'socket.io': 'Socket.io', 'ci/cd': 'CI/CD', aws: 'AWS', gcp: 'GCP', 'github actions': 'GitHub Actions',
  'power bi': 'Power BI', 'scikit-learn': 'scikit-learn', tensorflow: 'TensorFlow', pytorch: 'PyTorch', nlp: 'NLP', llm: 'LLMs', mlops: 'MLOps',
  etl: 'ETL', 'a/b testing': 'A/B Testing', oop: 'OOP', dbms: 'DBMS', 'ui design': 'UI Design', 'adobe xd': 'Adobe XD', owasp: 'OWASP', siem: 'SIEM',
  'microsoft office': 'Microsoft Office', 'google analytics': 'Google Analytics', 'spring boot': 'Spring Boot', fastapi: 'FastAPI', numpy: 'NumPy',
  'jetpack compose': 'Jetpack Compose', mvvm: 'MVVM', sqlite: 'SQLite', 'react native': 'React Native', 'play store': 'Play Store', nmap: 'Nmap',
  'burp suite': 'Burp Suite', 'data structures': 'Data Structures', 'problem solving': 'Problem Solving', git: 'Git', linux: 'Linux', jest: 'Jest',
  figma: 'Figma', tailwind: 'Tailwind CSS', redux: 'Redux', vite: 'Vite', stripe: 'Stripe', docker: 'Docker', kubernetes: 'Kubernetes',
  terraform: 'Terraform', excel: 'Excel', tableau: 'Tableau', pandas: 'pandas', matplotlib: 'Matplotlib', kotlin: 'Kotlin', flutter: 'Flutter',
  firebase: 'Firebase', android: 'Android', django: 'Django', flask: 'Flask', redis: 'Redis', nginx: 'Nginx', jenkins: 'Jenkins', azure: 'Azure', r: 'R', go: 'Go', c: 'C'
};

export const skillName = (k = '') => NAMES[k] || k.replace(/\b\w/g, (c) => c.toUpperCase());
