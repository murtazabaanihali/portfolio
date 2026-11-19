import { Card, CardContent } from "@/components/ui/card";
import { SkillsGrid } from "@/components/skills-grid";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageFullURL } from "@/lib/utils";
import { ABOUT_SECTION_BADGES } from "@/components/constant";

export function AboutSection() {
    return (
        <section id="about" className="py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        About Me
                    </h2>
                    <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                        I love building digital experiences that truly help people.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto mb-32">
                    <div className="order-2 md:order-1 hidden md:block">
                        <Card className="aspect-square flex items-center justify-center">
                            <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                                <Avatar className="size-48 sm:size-56 md:size-64">
                                    <AvatarImage
                                        src={getImageFullURL("profile-pic.jpeg")}
                                        alt="Murtaza Baanihali"
                                    />
                                    <AvatarFallback className="text-4xl font-bold">
                                        MB
                                    </AvatarFallback>
                                </Avatar>
                                <p className="text-muted-foreground font-medium text-sm sm:text-base">
                                    Professional Full-Stack Developer
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="order-1 md:order-2 space-y-8">
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-bold mb-6">
                                Hello, I&apos;m Murtaza! 👋
                            </h3>
                            <div className="md:hidden mb-6">
                                <Card className="aspect-square max-w-sm mx-auto flex items-center justify-center">
                                    <CardContent className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                                        <Avatar className="size-40 sm:size-48">
                                            <AvatarImage
                                                src={getImageFullURL("profile-pic.jpeg")}
                                                alt="Murtaza Baanihali"
                                            />
                                            <AvatarFallback className="text-3xl font-bold">
                                                MB
                                            </AvatarFallback>
                                        </Avatar>
                                        <p className="text-muted-foreground font-medium text-sm">
                                            Professional Full-Stack Developer
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="space-y-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
                                <p className="text-foreground">
                                    I&apos;m Murtaza, a full‑stack developer who turns ideas into shipped
                                    products. I build for web and mobile with a focus on
                                    performance, accessibility, and a clean user experience.
                                </p>
                                <p>
                                    I work end‑to‑end—scoping, UX, code, testing, and launch. I
                                    prefer pragmatic choices, thoughtful defaults, and clear,
                                    maintainable code. If you&apos;re exploring a new idea or growing an
                                    existing product, I can help.
                                </p>
                                <p className="[&>a]:font-medium [&>a]:text-foreground [&>a]:underline [&>a]:underline-offset-4">
                                    I am also founder of{" "}
                                    <a target="_blank" rel="noopener noreferrer" href="https://thesis.dhem.io/">
                                        Thesis Maker
                                    </a>
                                    ,{" "}
                                    <a target="_blank" rel="noopener noreferrer" href="https://ireplyy.dhem.io/">
                                        iReplyy
                                    </a>
                                    ,{" "}
                                    <a target="_blank" rel="noopener noreferrer" href="https://dhesend.vercel.app/">
                                        Dhesend
                                    </a>
                                    ,{" "}
                                    <a target="_blank" rel="noopener noreferrer" href="https://dhegen.dhem.io/">
                                        DheGEN
                                    </a>{" "}
                                    , and many other projects — each built to solve real problems
                                    I&apos;ve seen. It&apos;s rewarding to ship tools that people actually
                                    use.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            {ABOUT_SECTION_BADGES.map((badge, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                >
                                    {badge}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-center mb-16">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
                            Technologies I Work With
                        </h3>
                        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                            Here are the modern technologies and tools I use to build great
                            applications.
                        </p>
                    </div>
                    <SkillsGrid />
                </div>
            </div>
        </section>
    );
}
