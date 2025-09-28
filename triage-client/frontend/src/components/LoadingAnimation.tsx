"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./LoadingAnimation.module.css";

interface LoadingAnimationProps {
  message?: string;
  showCalmingMessage?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "pulse" | "spinner" | "dots" | "heartbeat";
}

const calmingMessages = [
  "Taking a moment to review your information...",
  "We're here to help you feel better...",
  "Carefully analyzing your symptoms...", 
  "Your health is our priority...",
  "Gathering the best care recommendations...",
  "Almost ready with your personalized assessment...",
  "Processing with care and attention...",
  "Building your health profile...",
  "Connecting you to the right care...",
  "Your wellbeing matters to us..."
];

export default function LoadingAnimation({ 
  message, 
  showCalmingMessage = true, 
  size = "medium",
  variant = "heartbeat"
}: LoadingAnimationProps) {
  const [currentMessage, setCurrentMessage] = useState(
    message || (showCalmingMessage ? calmingMessages[0] : "")
  );
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (showCalmingMessage && !message) {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % calmingMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [showCalmingMessage, message]);

  useEffect(() => {
    if (showCalmingMessage && !message) {
      setCurrentMessage(calmingMessages[messageIndex]);
    }
  }, [messageIndex, showCalmingMessage, message]);

  // We render a spinner ring around the centered brand circle regardless of variant,
  // to satisfy the design request of "loading around the circle".

  const logoPx = size === 'small' ? 28 : size === 'large' ? 44 : 36;
  const circleSizeClass = size === 'small' ? styles.brandCircleSmall : size === 'large' ? styles.brandCircleLarge : styles.brandCircleMedium;
  const ringSizeClass = size === 'small' ? styles.brandRingSmall : size === 'large' ? styles.brandRingLarge : styles.brandRingMedium;

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.centerWrap}>
        <div className={`${styles.brandCircle} ${circleSizeClass}`}>
          <Image src="/caladrius.png" alt="Caladrius" width={logoPx} height={logoPx} />
        </div>
        <div className={`${styles.brandRing} ${ringSizeClass}`} />
      </div>
      {(showCalmingMessage || message) && (
        <p className={`${styles.message} ${styles.fadeIn}`}>
          {currentMessage}
        </p>
      )}
    </div>
  );
}
// Removed standalone variant animations in favor of a unified ring around the logo