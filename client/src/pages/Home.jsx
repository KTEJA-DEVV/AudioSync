import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, LiveIndicator } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { 
  PlusCircle, 
  Radio, 
  Library, 
  Users, 
  Zap,
  TrendingUp,
  Music,
} from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, color }) => (
  <Card className="p-6 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </Card>
);

const Home = () => {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <LiveIndicator isActive={true} className="text-white bg-white/20 px-4 py-2 rounded-full" />
              <span className="ml-2 text-white/90 text-sm">3 sessions live now</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Create Music
              <span className="block text-indigo-200">Together</span>
            </h1>
            
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
              Join a global community of creators. Contribute lyrics, beats, and vocals. 
              Vote on ideas. Build songs collaboratively in real-time.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAdmin ? (
                <Link to="/create-session">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="bg-white text-indigo-600 hover:bg-indigo-50 px-8"
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Start Creating
                  </Button>
                </Link>
              ) : (
                <Link to="/sessions">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="bg-white text-indigo-600 hover:bg-indigo-50 px-8"
                  >
                    <Music className="w-5 h-5 mr-2" />
                    Browse Sessions
                  </Button>
                </Link>
              )}
              <Link to="/live-sessions">
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="text-white border-white/30 hover:bg-white/10 px-8"
                >
                  <Radio className="w-5 h-5 mr-2" />
                  Join Live Session
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 50L48 45.7C96 41 192 33 288 35.3C384 38 480 50 576 53.8C672 58 768 53 864 45.7C960 38 1056 28 1152 28.3C1248 28 1344 38 1392 43.2L1440 48V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="#F9FAFB"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How CrowdBeat Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A new way to make music. No experience needed.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Radio}
              title="Join Live Sessions"
              description="Jump into active sessions where music is being created in real-time. Watch, listen, and participate."
              color="bg-indigo-500"
            />
            <FeatureCard 
              icon={Music}
              title="Contribute Ideas"
              description="Submit lyrics, melodies, beats, or vocals. Every voice matters in the creative process."
              color="bg-purple-500"
            />
            <FeatureCard 
              icon={Users}
              title="Vote Together"
              description="Democracy in action. The crowd decides which contributions make it into the final track."
              color="bg-pink-500"
            />
            <FeatureCard 
              icon={Zap}
              title="AI-Assisted"
              description="Get creative suggestions, auto-harmonization, and intelligent mixing powered by AI."
              color="bg-amber-500"
            />
            <FeatureCard 
              icon={TrendingUp}
              title="Build Reputation"
              description="Earn points and badges for accepted contributions. Climb the leaderboard."
              color="bg-emerald-500"
            />
            <FeatureCard 
              icon={Library}
              title="Own Your Work"
              description="Fair revenue sharing for all contributors. Get paid when songs are streamed."
              color="bg-blue-500"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Create?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of creators making music together. It's free to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button variant="primary" size="lg" className="px-8">
                Get Started Free
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="outline" size="lg" className="px-8">
                View Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-white mb-2">10K+</p>
              <p className="text-gray-400">Active Creators</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-2">500+</p>
              <p className="text-gray-400">Songs Created</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-2">1M+</p>
              <p className="text-gray-400">Contributions</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-2">$50K+</p>
              <p className="text-gray-400">Paid to Creators</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
