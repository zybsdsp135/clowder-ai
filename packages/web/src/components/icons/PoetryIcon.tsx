export function PoetryIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 5.5C6 4.12 7.12 3 8.5 3H18v16.5c0 .83-.67 1.5-1.5 1.5H8.5A2.5 2.5 0 0 1 6 18.5v-13Z" />
      <path d="M6 18.5C6 17.12 7.12 16 8.5 16H18" />
      <path d="M9.5 7.5h5" />
      <path d="M9.5 10.5h5" />
      <path d="M9.5 13.5H13" />
    </svg>
  );
}
