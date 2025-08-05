import { SKILL_CATEGORIES } from "@/components/constant";
import { cn } from "@/lib/utils";

export function SkillsGrid() {
    return (
        <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {SKILL_CATEGORIES.map((category, categoryIndex) => (
                    <div
                        key={categoryIndex}
                        className="group relative bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="mb-6 inline-block">
                            <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                                {category.title}
                            </h3>
                            <div
                                className={`w-full h-1 bg-gradient-to-r ${category.gradient} rounded-full`}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {category.skills.map((skill, skillIndex) => (
                                <a
                                    href={skill.url}
                                    target="_blank"
                                    className="size-full"
                                    key={skillIndex}
                                >
                                    <button
                                        className="group/skill size-full flex flex-col items-center p-3 rounded-xl bg-muted/70 hover:bg-muted transition-all duration-200 border border-border/50 hover:border-primary/30 hover:shadow-md cursor-pointer"
                                        title={`Visit ${skill.name} official website`}
                                        aria-label={`Visit ${skill.name} official website`}
                                    >
                                        <div className="w-8 h-8 mb-2 group-hover/skill:scale-110 transition-transform duration-200">
                                            <skill.icon
                                                className={cn(
                                                    "size-7",
                                                    // @ts-ignore
                                                    skill?.className
                                                )}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-center text-muted-foreground group-hover/skill:text-foreground transition-colors">
                                            {skill.name}
                                        </span>
                                    </button>
                                </a>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-20 text-center text-lg md:text-xl font-semibold max-w-3xl mx-auto">
                These represent only the{" "}
                <span className="gradient-text">tip of the iceberg</span> — a
                glimpse into the diverse technologies I have mastered and
                applied throughout my development career.
            </p>
        </div>
    );
};