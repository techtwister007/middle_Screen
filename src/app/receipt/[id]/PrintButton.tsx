"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="mt-6 h-10 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white print:hidden">
      Print / Save as PDF
    </button>
  );
}
