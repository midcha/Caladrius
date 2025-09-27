"use client";

import { useEffect, useState } from "react";
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

  const getAnimationComponent = () => {
    switch (variant) {
      case "pulse":
        return <PulseAnimation size={size} />;
      case "spinner":
        return <SpinnerAnimation size={size} />;
      case "dots":
        return <DotsAnimation size={size} />;
      case "heartbeat":
      default:
        return <HeartbeatAnimation size={size} />;
    }
  };

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.animationWrapper}>
        {getAnimationComponent()}
      </div>
      {(showCalmingMessage || message) && (
        <p className={`${styles.message} ${styles.fadeIn}`}>
          {currentMessage}
        </p>
      )}
    </div>
  );
}

function HeartbeatAnimation({ size }: { size: string }) {
  return (
    <div className={`${styles.heartbeat} ${styles[size]}`}>
      <div className={styles.heartbeatInner}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}

function PulseAnimation({ size }: { size: string }) {
  return (
    <div className={`${styles.pulse} ${styles[size]}`}>
      <div className={styles.pulseRing}></div>
      <div className={styles.pulseRing}></div>
      <div className={styles.pulseRing}></div>
    </div>
  );
}

function SpinnerAnimation({ size }: { size: string }) {
  return (
    <div className={`${styles.spinner} ${styles[size]}`}>
      <div className={styles.spinnerInner}></div>
    </div>
  );
}

function DotsAnimation({ size }: { size: string }) {
  return (
    <div className={`${styles.dots} ${styles[size]}`}>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
    </div>
  );
}