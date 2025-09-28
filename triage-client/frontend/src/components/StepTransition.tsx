"use client";

import { ReactNode, useState, useEffect } from "react";
import LoadingAnimation from "./LoadingAnimation";
import styles from "./StepTransition.module.css";

interface StepTransitionProps {
  children: ReactNode;
  isLoading: boolean;
  loadingMessage?: string;
  variant?: "pulse" | "spinner" | "dots" | "heartbeat";
  onTransitionComplete?: () => void;
}

export default function StepTransition({
  children,
  isLoading,
  loadingMessage,
  variant = "heartbeat",
  onTransitionComplete
}: StepTransitionProps) {
  const [showContent, setShowContent] = useState(!isLoading);
  const [showLoading, setShowLoading] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      // Hide content first, then show loading
      setShowContent(false);
      setTimeout(() => {
        setShowLoading(true);
      }, 300);
    } else {
      // Hide loading first, then show content
      setShowLoading(false);
      setTimeout(() => {
        setShowContent(true);
        onTransitionComplete?.();
      }, 300);
    }
  }, [isLoading, onTransitionComplete]);

  return (
    <div className={styles.container}>
      {showLoading && (
        <div className={`${styles.loadingWrapper} ${isLoading ? styles.fadeIn : styles.fadeOut}`}>
          <LoadingAnimation 
            message={loadingMessage}
            variant={variant}
            size="large"
          />
        </div>
      )}
      
      {showContent && (
        <div className={`${styles.contentWrapper} ${!isLoading ? styles.slideIn : styles.slideOut}`}>
          {children}
        </div>
      )}
    </div>
  );
}