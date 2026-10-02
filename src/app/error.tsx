"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>Something is temporarily unavailable.</h1>
      <p>
        Please try again. Your data has not been replaced with demo records.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
