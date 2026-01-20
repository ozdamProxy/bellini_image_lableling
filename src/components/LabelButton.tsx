'use client';

import { Label } from '@/types/image';

interface LabelButtonProps {
  label: Label;
  onClick: (label: Label) => void;
  disabled?: boolean;
}

const labelConfig = {
  pass: {
    text: 'Pass',
    color: 'bg-green-500 hover:bg-green-600',
    emoji: '✓',
  },
  faulty: {
    text: 'Faulty',
    color: 'bg-red-500 hover:bg-red-600',
    emoji: '✗',
  },
  maybe: {
    text: 'Maybe',
    color: 'bg-yellow-500 hover:bg-yellow-600',
    emoji: '?',
  },
  unlabeled: {
    text: 'Unlabeled',
    color: 'bg-gray-500 hover:bg-gray-600',
    emoji: '○',
  },
};

export default function LabelButton({ label, onClick, disabled }: LabelButtonProps) {
  const config = labelConfig[label];

  return (
    <button
      onClick={() => onClick(label)}
      disabled={disabled}
      className={`${config.color} text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg shadow-lg transition-all transform active:scale-95 sm:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 text-base sm:text-lg min-w-[120px] sm:min-w-[140px] w-full sm:w-auto touch-manipulation`}
    >
      <span className="mr-1 sm:mr-2 text-xl sm:text-2xl">{config.emoji}</span>
      {config.text}
    </button>
  );
}
