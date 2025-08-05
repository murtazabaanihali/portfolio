-- Insert sample projects
INSERT INTO projects (title, slug, short_description, description, main_image, images, tech_stack, live_url, github_url) VALUES
(
  'E-Commerce Platform',
  'ecommerce-platform',
  'A full-stack e-commerce solution with real-time inventory management.',
  'A comprehensive e-commerce platform built with modern technologies to provide seamless shopping experiences.

Key Features:
• Real-time inventory management
• Secure payment processing with Stripe
• Advanced search and filtering
• Admin dashboard with analytics
• Mobile-responsive design
• Multi-vendor support

This project demonstrates my ability to build scalable, secure, and user-friendly applications that handle complex business logic and high traffic loads.',
  '/placeholder.svg?height=400&width=600',
  '["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d", "https://images.unsplash.com/photo-1563013544-824ae1b704d3", "https://images.unsplash.com/photo-1556742111-a301076d9d18"]',
  '["Next.js", "TypeScript", "PostgreSQL", "Stripe", "Tailwind CSS", "Vercel"]',
  'https://example-ecommerce.com',
  'https://github.com/murtaza/ecommerce-platform'
),
(
  'Task Management App',
  'task-management-app',
  'A collaborative task management application with real-time updates.',
  'A powerful task management application designed for teams to collaborate effectively and stay organized.

Key Features:
• Real-time collaboration with WebSocket
• Drag-and-drop task organization
• Team member assignments
• Progress tracking and analytics
• File attachments and comments
• Mobile app with offline support

Built with performance and user experience in mind, this application handles complex state management and real-time synchronization across multiple clients.',
  '/placeholder.svg?height=400&width=600',
  '["https://images.unsplash.com/photo-1611224923853-80b023f02d71", "https://images.unsplash.com/photo-1586281380349-632531db7ed4", "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40"]',
  '["React Native", "Node.js", "Socket.io", "MongoDB", "Express", "AWS"]',
  'https://example-tasks.com',
  'https://github.com/murtaza/task-management'
),
(
  'AI-Powered Analytics Dashboard',
  'ai-analytics-dashboard',
  'An intelligent analytics platform with AI-driven insights and predictions.',
  'An advanced analytics dashboard that leverages artificial intelligence to provide actionable business insights.

Key Features:
• AI-powered data analysis and predictions
• Interactive data visualizations
• Custom report generation
• Real-time data processing
• Multi-source data integration
• Automated anomaly detection

This project showcases my expertise in integrating AI/ML capabilities with modern web technologies to create intelligent business solutions.',
  '/placeholder.svg?height=400&width=600',
  '["https://images.unsplash.com/photo-1551288049-bebda4e38f71", "https://images.unsplash.com/photo-1460925895917-afdab827c52f", "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3"]',
  '["Vue.js", "Python", "TensorFlow", "D3.js", "FastAPI", "Google Cloud"]',
  'https://example-analytics.com',
  'https://github.com/murtaza/ai-analytics'
);
