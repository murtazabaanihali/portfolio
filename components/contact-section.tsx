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

export default function ContactSection() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const sent = await contactMe(new FormData(e.target as any));
        if (sent?.error) toast.error(sent.error);
        if (sent?.success) toast.success(sent.success);

        setIsSubmitting(false);
        if (sent?.success) (e.target as HTMLFormElement).reset();
    };

    return (
        <section id="contact" className="py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Get In Touch
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Ready to start your next project? Let's discuss how we
                        can work together.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Send me a message</CardTitle>
                                <CardDescription>
                                    Fill out the form below and I'll get back to
                                    you as soon as possible.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
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
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl font-semibold mb-6">
                                Contact Information
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <Mail className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Email</p>
                                        <p className="text-muted-foreground">
                                            {
                                                process.env
                                                    .NEXT_PUBLIC_CONTACT_EMAIL
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <MapPin className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Location</p>
                                        <p className="text-muted-foreground">
                                            India, Jammu & Kashmir
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-5">
                                    {SOCIAL_LINKS.map((item, i) => (
                                        <a
                                            key={i}
                                            href={item.link}
                                            target="_blank"
                                            title={item.title}
                                        >
                                            <Button
                                                title={item.title}
                                                type="button"
                                                size={"icon"}
                                                variant={"ghost"}
                                                className="rounded-full"
                                            >
                                                <item.icon />
                                            </Button>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Let's Build Something Amazing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4">
                                    Whether you need a web application, mobile
                                    app, or full-stack solution, I'm here to
                                    help bring your ideas to life with
                                    cutting-edge technology and best practices.
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        Custom web applications
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        Mobile app development
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        API development & integration
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
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
