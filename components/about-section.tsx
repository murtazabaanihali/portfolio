import { Card } from "@/components/ui/card";
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
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                        About Me
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        I love building digital experiences that truly help
                        people.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 max-md:items-center max-w-6xl mx-auto mb-40">
                    <div className="order-2 md:order-1 hidden md:block">
                        <Card className="aspect-square relative overflow-hidden group bg-gradient-to-br from-muted/50 to-muted">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-blue-500/20 group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/50 to-transparent" />
                            <div className="relative z-10 h-full flex items-center justify-center">
                                <div className="text-center flex flex-col items-center justify-center gap-3">
                                    <Avatar className="size-64">
                                        <AvatarImage
                                            src={getImageFullURL(
                                                "profile-pic.jpeg"
                                            )}
                                        />
                                        <AvatarFallback className="text-6xl font-bold text-white bg-gradient-to-br from-violet-500 to-purple-600">
                                            MB
                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-muted-foreground font-medium">
                                        Professional full-stack Developer
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="order-1 md:order-2 space-y-10">
                        <div>
                            <h3 className="text-3xl font-bold mb-8">
                                Hello, I'm Murtaza! 👋
                            </h3>
                            <div className="md:hidden mb-6">
                                <Card className="aspect-square max-w-lg mx-auto relative overflow-hidden group bg-gradient-to-br from-muted/50 to-muted">
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-blue-500/20 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/50 to-transparent" />
                                    <div className="relative z-10 h-full flex items-center justify-center">
                                        <div className="text-center flex flex-col items-center justify-center gap-3">
                                            <Avatar className="size-64">
                                                <AvatarImage
                                                    src={getImageFullURL(
                                                        "profile-pic.jpeg"
                                                    )}
                                                />
                                                <AvatarFallback className="text-6xl font-bold text-white bg-gradient-to-br from-violet-500 to-purple-600">
                                                    MB
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="text-muted-foreground font-medium">
                                                Professional full-stack
                                                Developer
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                            <div className="space-y-4 text-lg leading-relaxed">
                                <p>
                                    Hello! I’m a full-stack developer with
                                    several years of hands-on experience turning
                                    ideas into working apps. I enjoy building
                                    both web and mobile projects that are
                                    efficient, simple to use, and can easily
                                    grow with your needs. My journey also
                                    includes working with AI and new
                                    technologies, which keeps things fun and
                                    exciting.
                                </p>
                                <p>
                                    I care about writing clear, reliable code
                                    and making every project as user-friendly as
                                    possible. I'm always curious and keep
                                    learning new things to stay updated and
                                    offer the best solutions I can. Whether you
                                    need a fresh app, a bit of support, or
                                    someone to brainstorm with, I’m here to
                                    help—let’s build something amazing
                                    together!
                                </p>
                            </div>  
                        </div>

                        <div className="flex flex-wrap gap-3 mx-0 my-0 py-2.5">
                            {ABOUT_SECTION_BADGES.map((badge, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="px-3 py-1 text-sm"
                                >
                                    {badge}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-center mb-20">
                        <h3 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                            Technologies I Work With
                        </h3>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Here are the modern technologies and tools I use to
                            build great applications.
                        </p>
                    </div>
                    <SkillsGrid />
                </div>
            </div>
        </section>
    );
}
