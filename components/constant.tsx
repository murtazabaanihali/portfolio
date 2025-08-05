import {
    React,
    NextJs,
    VueJs,
    TypeScript,
    JavaScript,
    TailwindCSS,
    NodeJs,
    Python,
    ExpressJsDark,
    Django,
    FastAPI,
    PostgreSQL,
    MongoDB,
    Redis,
    Supabase,
    Firebase,
    AWS,
    GoogleCloud,
    Docker,
    VercelDark,
    Tensorflow,
    FlaskDark,
    MySQL,
    HuggingFace,
    ChatGPT,
    ClaudeAI,
    DeepSeek,
    Render,
    Electron,
    GitHubDark,
    LinkedIn,
    Twitter,
    Facebook,
    Instagram,
    XDark,
} from "developer-icons";
import { ChevronUp, Workflow } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProjectTag } from "@/lib/db/schema";

const ReplicateIcon = ({ ...props }: any) => {
    return (
        <svg
            fill="currentColor"
            fillRule="evenodd"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <title>Replicate</title>
            <path d="M22 10.552v2.26h-7.932V22H11.54V10.552H22zM22 2v2.264H4.528V22H2V2h20zm0 4.276V8.54H9.296V22H6.768V6.276H22z"></path>
        </svg>
    );
};

export const GithubIcon = ({ className, ...props }: any) => {
    return (
        <GitHubDark
            className={cn(className, "[&>path]:fill-foreground")}
            {...props}
        />
    );
};

export const SKILL_CATEGORIES = [
    {
        title: "Frontend Development",
        gradient: "from-blue-500 to-cyan-500",
        skills: [
            { name: "React", icon: React, url: "https://react.dev" },
            { name: "Next.js", icon: NextJs, url: "https://nextjs.org" },
            { name: "Vue.js", icon: VueJs, url: "https://vuejs.org" },
            {
                name: "TypeScript",
                icon: TypeScript,
                url: "https://www.typescriptlang.org",
            },
            {
                name: "JavaScript",
                icon: JavaScript,
                url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
            },
            {
                name: "Tailwind CSS",
                icon: TailwindCSS,
                url: "https://tailwindcss.com",
            },
        ],
    },
    {
        title: "Backend Development",
        gradient: "from-green-500 to-emerald-500",
        skills: [
            { name: "Node.js", icon: NodeJs, url: "https://nodejs.org" },
            {
                name: "Express.js",
                icon: ExpressJsDark,
                url: "https://expressjs.com/",
                className: "fill-teal-500",
            },
            { name: "Python", icon: Python, url: "https://www.python.org" },
            {
                name: "Django",
                icon: Django,
                url: "https://www.djangoproject.com",
            },
            {
                name: "Flask",
                icon: ({ className, ...props }: any) => (
                    <FlaskDark
                        className={cn(className, "[&>path]:fill-current")}
                        fill="currentColor"
                        {...props}
                    />
                ),
                url: "https://flask.palletsprojects.com/",
            },
            {
                name: "FastAPI",
                icon: FastAPI,
                url: "https://fastapi.tiangolo.com",
            },
        ],
    },
    {
        title: "Mobile & Desktop Development",
        gradient: "from-purple-500 to-pink-500",
        skills: [
            {
                name: "React Native",
                icon: React,
                url: "https://reactnative.dev",
            },
            { name: "Expo", icon: ChevronUp, url: "https://expo.dev/" },
            {
                name: "Electron.js",
                icon: Electron,
                url: "https://electronjs.org/",
            },
            {
                name: "Python Kivy",
                icon: Python,
                url: "https://kivy.org/",
            },
        ],
    },
    {
        title: "Database & Storage",
        gradient: "from-orange-500 to-red-500",
        skills: [
            {
                name: "PostgreSQL",
                icon: PostgreSQL,
                url: "https://www.postgresql.org",
            },
            {
                name: "MySQL",
                icon: MySQL,
                url: "https://mysql.com/",
            },
            { name: "MongoDB", icon: MongoDB, url: "https://www.mongodb.com" },
            { name: "Redis", icon: Redis, url: "https://redis.io" },
            { name: "Supabase", icon: Supabase, url: "https://supabase.com" },
            {
                name: "Firebase",
                icon: Firebase,
                url: "https://firebase.google.com",
            },
        ],
    },
    {
        title: "Cloud & DevOps",
        gradient: "from-indigo-500 to-purple-500",
        skills: [
            {
                name: "AWS",
                icon: ({ className, ...props }: any) => (
                    <AWS
                        className={cn(className, "[&>path]:fill-current")}
                        {...props}
                    />
                ),
                url: "https://aws.amazon.com",
            },
            {
                name: "Google Cloud",
                icon: GoogleCloud,
                url: "https://cloud.google.com",
            },
            { name: "Docker", icon: Docker, url: "https://www.docker.com" },
            {
                name: "Vercel",
                icon: ({ className, ...props }: any) => (
                    <VercelDark
                        className={cn(className, "[&>path]:fill-current")}
                        fill="currentColor"
                        {...props}
                    />
                ),
                url: "https://vercel.com",
            },
            {
                name: "Render",
                icon: ({ className, ...props }: any) => (
                    <Render
                        className={cn(className, "[&>path]:fill-current")}
                        fill="currentColor"
                        {...props}
                    />
                ),
                url: "https://render.com/",
            },
            {
                name: "CI/CD",
                icon: Workflow,
                url: "https://github.com/features/actions",
            },
        ],
    },
    {
        title: "AI & Machine Learning",
        gradient: "from-violet-500 to-purple-500",
        skills: [
            {
                name: "Hugging Face",
                icon: HuggingFace,
                url: "https://huggingface.co/",
            },
            {
                name: "Replicate",
                icon: ReplicateIcon,
                url: "https://replicate.com/",
            },
            {
                name: "TensorFlow",
                icon: Tensorflow,
                url: "https://www.tensorflow.org",
            },
            {
                name: "Claude AI",
                icon: ClaudeAI,
                url: "https://anthropic.com/claude",
            },
            {
                name: "DeepSeek",
                icon: DeepSeek,
                url: "https://www.deepseek.com/",
            },
            { name: "OpenAI", icon: ChatGPT, url: "https://openai.com" },
        ],
    },
];

export const NAVIGATION_ITEMS = [
    { name: "Home", href: "/" },
    { name: "Projects", href: "/projects" },
    { name: "About", href: "/#about" },
    { name: "Contact", href: "/#contact" },
];

export const SOCIAL_LINKS = [
    {
        icon: GithubIcon,
        link: "https://github.com/murtazabaanihali",
        title: "Github",
    },
    {
        icon: LinkedIn,
        link: "https://www.linkedin.com/in/murtazabaanihali/",
        title: "Linkedin",
    },
    {
        icon: ({ className, ...props }: any) => (
            <XDark
                className={cn(className, "[&>path]:fill-foreground")}
                {...props}
            />
        ),
        link: "https://x.com/murtazabanihali",
        title: "Twitter",
    },
    {
        icon: Facebook,
        link: "https://facebook.com/murtazabaanihali",
        title: "Facebook",
    },
    {
        icon: Instagram,
        link: "https://instagram.com/murtazabaanihali",
        title: "Instagram",
    },
];

export const PROJECT_FILTER_MAP: Partial<Record<ProjectTag, string>> = {
    web: "Web Apps",
    mobile: "Mobile Apps",
    ai: "AI/ML",
    desktop: "Desktop Apps",
    saas: "SAAS",
    other: "Other",
};

export const ABOUT_SECTION_BADGES = [
    "⚡ Rapid Adaptor",
    "🧠 Strategic Thinker",
    "🔍 Detail Oriented",
    "🤖 AI Visionary",
    "🔥 Peak Performer",
];