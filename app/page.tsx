export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">CLIPPER WORKS!</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/podcasts" className="text-gray-700 hover:text-gray-900">Try Demo</a>
              <a href="/login" className="text-gray-700 hover:text-gray-900">Sign In</a>
              <a href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Get Started</a>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            FINALLY! THE CLIPPER APP IS WORKING!
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Transform podcasts into viral clips with AI
          </p>
          <div className="mt-10">
            <a href="/podcasts" className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-green-700 mr-4">
              Try Demo (No Signup Required)
            </a>
            <a href="/signup" className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700">
              Get Started
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}