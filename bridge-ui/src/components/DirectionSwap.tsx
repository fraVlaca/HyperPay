type Props = {
  onSwap: () => void;
  disabled?: boolean;
};

export default function DirectionSwap({ onSwap, disabled }: Props) {
  return (
    <div className="flex items-center justify-center">
      <button
        disabled={disabled}
        onClick={onSwap}
        className="rounded-full border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition hover:shadow disabled:opacity-40"
        aria-label="Swap direction"
        title="Swap direction"
      >
        <svg
          className="h-5 w-5 transition-transform duration-200 active:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M3 7h13M10 3l6 4-6 4M21 17H8M14 13l-6 4 6 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
