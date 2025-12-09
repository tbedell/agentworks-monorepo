import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface TourBeaconProps {
  targetSelector: string;
  isActive: boolean;
  onClick?: () => void;
  color?: 'blue' | 'purple' | 'green';
  size?: 'sm' | 'md' | 'lg';
}

export function TourBeacon({
  targetSelector,
  isActive,
  onClick,
  color = 'blue',
  size = 'md',
}: TourBeaconProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isActive) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        });
      } else {
        setPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 500);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetSelector, isActive]);

  if (!isActive || !position) return null;

  const colorClasses = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
  };

  const ringColorClasses = {
    blue: 'bg-blue-500/30',
    purple: 'bg-purple-500/30',
    green: 'bg-green-500/30',
  };

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const ringSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return createPortal(
    <div
      className="fixed z-[9998] pointer-events-auto cursor-pointer"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={onClick}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={clsx(
            'absolute rounded-full animate-ping',
            ringColorClasses[color],
            ringSizeClasses[size]
          )}
        />
        <div
          className={clsx(
            'absolute rounded-full animate-pulse opacity-50',
            ringColorClasses[color],
            ringSizeClasses[size]
          )}
          style={{ animationDelay: '0.5s' }}
        />
        <div
          className={clsx(
            'relative rounded-full shadow-lg',
            colorClasses[color],
            sizeClasses[size]
          )}
        />
      </div>
    </div>,
    document.body
  );
}

export function TourBeaconInline({
  isActive,
  onClick,
  color = 'blue',
  size = 'md',
}: Omit<TourBeaconProps, 'targetSelector'>) {
  if (!isActive) return null;

  const colorClasses = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
  };

  const ringColorClasses = {
    blue: 'bg-blue-500/30',
    purple: 'bg-purple-500/30',
    green: 'bg-green-500/30',
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const ringSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <span
      className="inline-flex items-center justify-center cursor-pointer ml-2"
      onClick={onClick}
    >
      <span className="relative flex items-center justify-center">
        <span
          className={clsx(
            'absolute rounded-full animate-ping',
            ringColorClasses[color],
            ringSizeClasses[size]
          )}
        />
        <span
          className={clsx(
            'relative rounded-full shadow-lg',
            colorClasses[color],
            sizeClasses[size]
          )}
        />
      </span>
    </span>
  );
}
