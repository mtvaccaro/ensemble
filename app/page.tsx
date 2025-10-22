'use client';
import posthog from 'posthog-js';

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
              <a href="/podcasts" onClick={() => posthog.capture('cta_clicked', { cta_text: 'Try Demo', location: 'navbar', target_url: '/podcasts' })} className="text-gray-700 hover:text-gray-900">Try Demo</a>
              <a href="/login" onClick={() => posthog.capture('cta_clicked', { cta_text: 'Sign In', location: 'navbar', target_url: '/login' })} className="text-gray-700 hover:text-gray-900">Sign In</a>
              <a href="/signup" onClick={() => posthog.capture('cta_clicked', { cta_text: 'Get Started', location: 'navbar', target_url: '/signup' })} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Get Started</a>
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
          
          {/* New Canvas Editor Feature */}
          <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 max-w-2xl mx-auto">
            <div className="text-2xl mb-2">🎨✨</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              New: Canvas Clip Editor
            </h2>
            <p className="text-gray-700 mb-4">
              Drag episodes onto a canvas, create clips, and arrange them visually. No signup required!
            </p>
            <a 
              href="/canvas" 
              onClick={() => posthog.capture('cta_clicked', { cta_text: 'Try Canvas Editor', location: 'hero_feature', target_url: '/canvas' })} 
              className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              🚀 Try Canvas Editor
            </a>
          </div>
          
          <div className="mt-10">
            <a href="/podcasts" onClick={() => posthog.capture('cta_clicked', { cta_text: 'Try Demo (No Signup Required)', location: 'hero', target_url: '/podcasts' })} className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-green-700 mr-4">
              Try Demo (No Signup Required)
            </a>
            <a href="/signup" onClick={() => posthog.capture('cta_clicked', { cta_text: 'Get Started', location: 'hero', target_url: '/signup' })} className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700">
              Get Started
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}