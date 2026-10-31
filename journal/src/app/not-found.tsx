import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-md text-center">
      <h1 className="h1">Not found</h1>
      <Link href="/" className="mt-4 inline-block text-accent underline">Back to the command center</Link>
    </main>
  );
}
