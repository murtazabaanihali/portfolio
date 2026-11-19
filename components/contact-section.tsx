"use client";

import type React from "react";
import { Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SOCIAL_LINKS } from "@/components/constant";
import { contactMe } from "@/actions";
import { trackUmamiEvent } from "@/lib/analytics";

export default function ContactSection() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const form = new FormData(e.target as any);

        // Safe Umami tracking: if analytics script is blocked or missing, do not disrupt form submission
        try {
            trackUmamiEvent("contact-form-submitted", {
                ...Object.fromEntries(form.entries()),
            });
        } catch (error) {
            console.warn("Umami tracking error:", error);
        }

        try {
            const sent = await contactMe(form);
            if (sent?.error) toast.error(sent.error);
            if (sent?.success) toast.success(sent.success);

            if (sent?.success) (e.target as HTMLFormElement).reset();
        } catch (error) {
            console.error("Error sending contact email:", error);
            toast.error("Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="contact" className="py-20">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Get In Touch
                    </h2>
                    <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Ready to start your next project? Let&apos;s discuss how we
                        can work together.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <Card>
                        <CardHeader>
                            <CardTitle>Send me a message</CardTitle>
                            <CardDescription>
                                Fill out the form below and I&apos;ll get back to
                                you as soon as possible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            disabled={isSubmitting}
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            disabled={isSubmitting}
                                            placeholder="Your email"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input
                                        id="subject"
                                        name="subject"
                                        required
                                        disabled={isSubmitting}
                                        placeholder="Subject of message"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea
                                        id="message"
                                        name="message"
                                        rows={5}
                                        required
                                        disabled={isSubmitting}
                                        placeholder="The message..."
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Sending..."
                                        : "Send Message"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                                        <Mail className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">Email</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                                        <MapPin className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">Location</p>
                                        <p className="text-sm text-muted-foreground">
                                            India, Jammu & Kashmir
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {SOCIAL_LINKS.map((item, i) => (
                                        <Button
                                            key={i}
                                            asChild
                                            variant="outline"
                                            size="icon"
                                            data-umami-event={item.title}
                                        >
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={item.title}
                                            >
                                                <item.icon className="size-4" />
                                            </a>
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Let&apos;s Build Something Amazing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                    Whether you need a web application, mobile
                                    app, or full-stack solution, I&apos;m here to
                                    help bring your ideas to life with
                                    cutting-edge technology and best practices.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <span className="size-1.5 bg-primary rounded-full" />
                                        Custom web applications
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="size-1.5 bg-primary rounded-full" />
                                        Mobile app development
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="size-1.5 bg-primary rounded-full" />
                                        API development & integration
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="size-1.5 bg-primary rounded-full" />
                                        Database design & optimization
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    );
}
