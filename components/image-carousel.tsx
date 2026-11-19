"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getImageFullURL, cn } from "@/lib/utils";

interface ImageCarouselProps {
    images: string[];
    title: string;
}

export function ImageCarousel({ images, title }: ImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    if (images.length === 0) {
        return (
            <Card className="aspect-video bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No images available</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="relative aspect-[2] overflow-hidden p-0">
                <Image
                    src={getImageFullURL(images[currentIndex])}
                    alt={`${title} - Image ${currentIndex + 1}`}
                    width={0}
                    height={0}
                    sizes="(max-width: 1024px) 100vw, 896px"
                    quality={75}
                    className="object-contain size-full"
                />

                {images.length > 1 && (
                    <>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2"
                            onClick={prevImage}
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                            onClick={nextImage}
                            aria-label="Next image"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </Card>

            {images.length > 1 && (
                <div className="flex gap-2 justify-center">
                    {images.map((image, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => setCurrentIndex(index)}
                            aria-label={`View image ${index + 1}`}
                            className={cn(
                                "relative aspect-square max-w-24 flex-1 overflow-hidden rounded-md border transition-all",
                                index === currentIndex
                                    ? "border-primary ring-2 ring-ring/30"
                                    : "border-border opacity-70 hover:opacity-100"
                            )}
                        >
                            <Image
                                src={getImageFullURL(image)}
                                alt={`${title} - Thumbnail ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 25vw, 96px"
                                className="object-cover size-full"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
