"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getImageFullURL } from "@/lib/utils";

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
                <p className="text-muted-foreground">No images available</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="relative aspect-[2] overflow-hidden p-0 m-0">
                <Image
                    src={getImageFullURL(images[currentIndex])}
                    alt={`${title} - Image ${currentIndex + 1}`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    fill={false}
                    quality={100}
                    className="object-contain size-full"
                />

                {images.length > 1 && (
                    <>
                        <Button
                            variant="outline"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                            onClick={prevImage}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                            onClick={nextImage}
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
                            onClick={() => setCurrentIndex(index)}
                            className={`rounded-lg overflow-hidden border-2 transition-all aspect-square relative flex-1  max-w-32 max-h-32 ${
                                index === currentIndex
                                    ? "border-primary"
                                    : "border-transparent"
                            }`}
                        >
                            <Image
                                src={getImageFullURL(image)}
                                alt={`${title} - Thumbnail ${index + 1}`}
                                fill
                                className="object-cover size-full max-w-32 max-h-32 aspect-square"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
