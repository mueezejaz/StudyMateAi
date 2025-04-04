import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Cpu, FileText, Brain, MessageSquare, Users, ChevronRight } from 'lucide-react';
import Navbar from '../components/NavBar';
import { useAuth } from '../context/Auth';

const Home = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const [recentAgents, setRecentAgents] = useState([]);

  useEffect(() => {
    // This would fetch recent agents when implemented
    // For now using placeholder data
    if (isAuthenticated) {
      setRecentAgents([
        { _id: '1', name: 'Research Assistant', description: 'Helps with academic research and paper analysis' },
        { _id: '2', name: 'Data Analyst', description: 'Processes and visualizes data from various sources' }
      ]);
    }
  }, [isAuthenticated]);

  // Hero section component
  const Hero = () => (
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-xl p-8 mb-10">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Build Your Personal AI Agents
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Create, customize, and collaborate with AI agents trained on your data
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => navigate('/aiagents')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors duration-200"
          >
            Get Started
          </button>
          <button 
            onClick={() => navigate('/about')}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors duration-200"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );

  // Feature card component
  const FeatureCard = ({ icon, title, description }) => (
    <div className="bg-gray-800 rounded-lg p-6 transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/20 hover:translate-y-[-5px]">
      <div className="bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );

  // Features section
  const Features = () => (
    <div className="mb-16">
      <h2 className="text-2xl font-bold text-white mb-8 text-center">Key Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard 
          icon={<Brain className="w-6 h-6 text-blue-400" />}
          title="Custom AI Agents" 
          description="Create specialized AI agents trained on your specific data and requirements"
        />
        <FeatureCard 
          icon={<FileText className="w-6 h-6 text-blue-400" />}
          title="Document Processing" 
          description="Upload PDF files and images to train your agents with relevant information"
        />
        <FeatureCard 
          icon={<Users className="w-6 h-6 text-blue-400" />}
          title="Team Collaboration" 
          description="Share agents with team members for seamless knowledge sharing"
        />
        <FeatureCard 
          icon={<MessageSquare className="w-6 h-6 text-blue-400" />}
          title="Interactive Chat" 
          description="Engage with your agents through natural language conversations"
        />
        <FeatureCard 
          icon={<Cpu className="w-6 h-6 text-blue-400" />}
          title="Advanced Intelligence" 
          description="Powered by state-of-the-art AI models for accurate and helpful responses"
        />
        <FeatureCard 
          icon={<ChevronRight className="w-6 h-6 text-blue-400" />}
          title="Endless Possibilities" 
          description="From research assistants to data analysts, create agents for any need"
        />
      </div>
    </div>
  );

  // Recent agents section for logged in users
  const RecentAgents = () => (
    <div className="mb-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Your Recent Agents</h2>
        <button 
          onClick={() => navigate('/aiagents')}
          className="text-blue-400 hover:text-blue-300 flex items-center"
        >
          View All <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recentAgents.map(agent => (
          <div key={agent._id} className="bg-gray-800 rounded-lg p-4 flex items-start space-x-4">
            <div className="bg-blue-900 rounded-full p-3">
              <Cpu className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white">{agent.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{agent.description}</p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => navigate(`/aiagents/${agent._id}`)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded"
                >
                  Manage
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded flex items-center">
                  <MessageSquare className="w-3 h-3 mr-1" /> Chat
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Get started CTA section
  const GetStartedCTA = () => (
    <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-8 text-center">
      <h2 className="text-2xl font-bold text-white mb-4">Ready to enhance your workflow?</h2>
      <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
        Start creating your custom AI agents today and experience the power of personalized artificial intelligence.
      </p>
      {!isAuthenticated ? (
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => navigate('/signup')}
            className="bg-white text-blue-900 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium"
          >
            Sign Up
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="bg-transparent border border-white text-white hover:bg-white/10 px-6 py-3 rounded-lg font-medium"
          >
            Log In
          </button>
        </div>
      ) : (
        <button 
          onClick={() => navigate('/aiagents')}
          className="bg-white text-blue-900 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium"
        >
          Create New Agent
        </button>
      )}
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex justify-center items-center">
          <div className="animate-pulse text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      
     {isAuthenticated? <Navbar />: ""}
      <div className="container mx-auto px-4 py-12">
        <Hero />
        <Features />
        {isAuthenticated && <RecentAgents />}
        <GetStartedCTA />
      </div>
    </div>
  );
};

export default Home;