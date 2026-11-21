# Murtaza Baanihali Portfolio

Welcome to my personal portfolio repository! This project showcases my skills, experience, and projects as a full stack software developer. It is designed to provide a clean and modern presentation of my work and expertise.

## Features

- Responsive design with a dark theme
- Overview of technical skills across frontend, backend, mobile, cloud, and AI/ML
- Detailed project listings with descriptions and technology tags
- About section highlighting my background and professional approach
- Contact form for easy communication and project inquiries
- Smooth navigation and user-friendly interface

## Technologies Used

- Next JS
- Tailwind CSS
- Shadcn UI
- TypeScript
- AWS Cloudfront

## Policy documents

`/privacy` and `/terms` render Markdown from the R2 bucket `portfolio` through
`NEXT_PUBLIC_MEDIA_CDN_DOMAIN`. The Markdown is stored only in R2.

To publish an update, upload the changed file to `assets/plocies/<filename>` in
that bucket with content type `text/markdown; charset=utf-8`. Purge the updated
file's public CDN URL if the change needs to appear immediately. The app does not
need to be rebuilt for policy text changes.