'use client';

/** Global CSS keyframe animations for the flash feed */
export default function FlashFeedAnimations() {
  return (
    <style jsx global>{`
      /* Radar pulse expansion */
      @keyframes radar-ping {
        0% { transform: scale(1); opacity: 0.5; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      /* Radar sweep line */
      @keyframes radar-sweep {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      /* New flash item slide-in */
      @keyframes flash-slide-in {
        0% {
          opacity: 0;
          transform: translateY(-30px) scale(0.97);
          max-height: 0;
        }
        30% {
          opacity: 0.5;
          max-height: 200px;
        }
        60% {
          transform: translateY(3px) scale(1.01);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          max-height: 200px;
        }
      }
      /* New flash item highlight */
      @keyframes flash-highlight {
        0% { background-color: rgba(59,130,246,0.15); }
        50% { background-color: rgba(59,130,246,0.08); }
        100% { background-color: transparent; }
      }
      /* Breaking news highlight */
      @keyframes flash-highlight-red {
        0% { background-color: rgba(239,68,68,0.2); }
        50% { background-color: rgba(239,68,68,0.1); }
        100% { background-color: transparent; }
      }
      /* Toast popup entrance */
      @keyframes toast-in {
        0% {
          opacity: 0;
          transform: translateX(100%) translateY(20px) scale(0.9);
        }
        50% {
          transform: translateX(-5%) translateY(0) scale(1.02);
        }
        100% {
          opacity: 1;
          transform: translateX(0) translateY(0) scale(1);
        }
      }
      /* Toast countdown timer */
      @keyframes toast-timer {
        0% { width: 100%; }
        100% { width: 0%; }
      }
      /* Top flash bar */
      @keyframes flash-bar {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      /* Bell ring animation */
      @keyframes bell-ring {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(15deg); }
        40% { transform: rotate(-15deg); }
        60% { transform: rotate(10deg); }
        80% { transform: rotate(-10deg); }
      }
      /* New item entrance animation classes */
      .flash-item-new {
        animation: flash-slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                   flash-highlight 2s ease-out 0.6s forwards;
      }
      .flash-item-new-red {
        animation: flash-slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                   flash-highlight-red 3s ease-out 0.6s forwards;
      }
      /* Old items push-down animation */
      .flash-item-push-down {
        animation: flash-push-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes flash-push-down {
        0% { transform: translateY(-20px); opacity: 0.7; }
        100% { transform: translateY(0); opacity: 1; }
      }
    `}</style>
  );
}
