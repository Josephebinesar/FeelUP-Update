export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto py-16">
      <h1 className="text-4xl font-bold mb-4">
        Welcome to FeelUp
      </h1>

      <p className="text-gray-600 text-lg mb-6">
        Track your mood, journal your thoughts, set goals,
        and grow emotionally every day.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-2">🧠 Mood Tracking</h3>
          <p className="text-sm text-gray-500">
            Understand how you feel each day.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-2">📓 Journaling</h3>
          <p className="text-sm text-gray-500">
            Express your thoughts safely.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-2">🎯 Goals</h3>
          <p className="text-sm text-gray-500">
            Build positive habits consistently.
          </p>
        </div>
      </div>
    </div>
  );
}
