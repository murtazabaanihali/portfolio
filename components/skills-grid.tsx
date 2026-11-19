import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SKILL_CATEGORIES } from "@/components/constant";
import { cn } from "@/lib/utils";

export function SkillsGrid() {
    return (
        <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SKILL_CATEGORIES.map((category, categoryIndex) => (
                    <Card key={categoryIndex}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold">
                                {category.title}
                            </CardTitle>
                            <Separator />
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-2.5">
                                {category.skills.map((skill, skillIndex) => (
                                    <Button
                                        key={skillIndex}
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-2 p-3 text-center whitespace-normal font-normal"
                                    >
                                        <a
                                            href={skill.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Visit ${skill.name} official website`}
                                        >
                                            <div className="size-6 flex items-center justify-center">
                                                <skill.icon
                                                    className={cn(
                                                        "size-6",
                                                        // @ts-ignore
                                                        skill?.className
                                                    )}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground truncate max-w-full">
                                                {skill.name}
                                            </span>
                                        </a>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <p className="mt-16 text-center text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                These represent only the{" "}
                <span className="font-semibold text-foreground">tip of the iceberg</span> — a
                glimpse into the diverse technologies I have mastered and
                applied throughout my development career.
            </p>
        </div>
    );
}
