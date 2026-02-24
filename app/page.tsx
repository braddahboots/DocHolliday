import Link from 'next/link';

export default function Home() {
  return (
    <div className="grid min-h-screen items-center justify-items-center p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          DocHolliday
        </h1>
        <p className="max-w-xl text-lg text-gray-600">
          Turn rough ideas into complete, high-quality, AI-coding-tool-ready
          Product Requirements Documents in minutes via guided conversation.
        </p>
        <Link
          href="/interview"
          className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Get Started
        </Link>
      </main>
    </div>
  );
}
