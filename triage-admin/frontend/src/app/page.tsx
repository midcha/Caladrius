import PriorityQueue from "../../components/PriorityQueue";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">ED Triage Priority Queue</h1>
      <PriorityQueue />
    </main>
  );
}
