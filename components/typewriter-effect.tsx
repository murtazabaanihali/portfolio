"use client"

import { useState, useEffect } from "react"

interface TypewriterEffectProps {
  words: string[]
  typeSpeed?: number
  deleteSpeed?: number
  delayBetweenWords?: number
}

export function TypewriterEffect({
  words,
  typeSpeed = 120,
  deleteSpeed = 80,
  delayBetweenWords = 2500,
}: TypewriterEffectProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    const currentWord = words[currentWordIndex]

    if (isWaiting) {
      const timeout = setTimeout(() => {
        setIsWaiting(false)
        setIsDeleting(true)
      }, delayBetweenWords)
      return () => clearTimeout(timeout)
    }

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // Typing
          if (currentText.length < currentWord.length) {
            setCurrentText(currentWord.slice(0, currentText.length + 1))
          } else {
            // Word is complete, wait then start deleting
            setIsWaiting(true)
          }
        } else {
          // Deleting
          if (currentText.length > 0) {
            setCurrentText(currentText.slice(0, -1))
          } else {
            // Word is deleted, move to next word
            setIsDeleting(false)
            setCurrentWordIndex((prev) => (prev + 1) % words.length)
          }
        }
      },
      isDeleting ? deleteSpeed : typeSpeed,
    )

    return () => clearTimeout(timeout)
  }, [currentText, isDeleting, isWaiting, currentWordIndex, words, typeSpeed, deleteSpeed, delayBetweenWords])

  return (
    <span className="gradient-text font-bold">
      {currentText}
      <span className="animate-pulse text-primary">|</span>
    </span>
  )
}
