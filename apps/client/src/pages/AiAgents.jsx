import { useState, useEffect } from "react";
import { User, Cpu, MessageSquare, Share2, Users } from "lucide-react";
import Navbar from "../components/NavBar";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router";
export default function AiAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", description: "" });
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch agents when component mounts
  useEffect(() => {
    // First get current user info to know user ID
    const fetchCurrentUser = async () => {
      try {
        const userResponse = await axios.get("http://localhost:8000/api/user/me", {
          withCredentials: true,
        });
        setCurrentUserId(userResponse.data.data.user._id);
        fetchAgents();
      } catch (error) {
        console.error("Error fetching current user:", error);
        toast.error("Failed to authenticate user");
      }
    };
    
    fetchCurrentUser();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/api/agent/", {
        withCredentials: true,
      });
      setAgents(response.data.data.agents);
    } catch (error) {
      toast.error("Failed to fetch agents");
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:8000/api/agent/create",
        newAgent,
        { withCredentials: true }
      );
      toast.success("Agent created successfully");
      setAgents([...agents, response.data.data]);
      setShowNewAgentModal(false);
      setNewAgent({ name: "", description: "" });
      fetchAgents(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create agent");
      console.error("Error creating agent:", error);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (window.confirm("Are you sure you want to delete this agent?")) {
      try {
        await axios.delete(`http://localhost:8000/api/agent/${agentId}`, {
          withCredentials: true,
        });
        toast.success("Agent deleted successfully");
        setAgents(agents.filter((agent) => agent._id !== agentId));
      } catch (error) {
        toast.error("Failed to delete agent");
        console.error("Error deleting agent:", error);
      }
    }
  };

  const handleShare = async (agentId) => {
    const email = prompt("Enter the email of the user you want to share with:");
    if (!email) return;
    
    try {
      await axios.post(
        "http://localhost:8000/api/agent/share",
        { agentId, email },
        { withCredentials: true }
      );
      toast.success("Agent shared successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to share agent");
      console.error("Error sharing agent:", error);
    }
  };

  // Separate agents into owned and shared
  const myAgents = agents.filter(agent => agent.admin?._id === currentUserId);
  const sharedWithMe = agents.filter(agent => agent.admin?._id !== currentUserId);

        const navigate = useNavigate();
  const renderAgentsList = (agentsList, isOwned) => {
    return (
      <div className="space-y-4">
        {agentsList.map((agent) => (
          <div
            key={agent._id}
            className={`p-4 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center ${
              isOwned ? "bg-gray-800" : "bg-gray-800 border border-blue-800"
            }`}
          >
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Cpu className={`w-8 h-8 ${isOwned ? "text-blue-500" : "text-purple-500"}`} />
              <div>
                <h2 className="text-lg font-semibold">{agent.name}</h2>
                <p className="text-gray-400">{agent.description}</p>
                <div className="flex items-center mt-1">
                  {isOwned ? (
                    <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full flex items-center">
                      <User className="w-3 h-3 mr-1" /> Owner
                    </span>
                  ) : (
                    <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full flex items-center">
                      <Share2 className="w-3 h-3 mr-1" /> Shared by {agent.admin?.username}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto mt-4 sm:mt-0">
              <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded w-full sm:w-auto flex items-center justify-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </button>
              <button onClick={() => navigate(`/aiagents/addata/${agent._id}`)}  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded w-full sm:w-auto">
                Add data
              </button>
              {isOwned && (
                <>
                  <button
                    className="bg-gray-700 text-gray-300 px-3 py-1 rounded hover:bg-gray-600 w-full sm:w-auto flex items-center justify-center space-x-1"
                    onClick={() => handleShare(agent._id)}
                  >
                    <Users className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded w-full sm:w-auto"
                    onClick={() => handleDeleteAgent(agent._id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <Navbar />
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">AI Agents</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-6 w-full sm:w-auto"
          onClick={() => setShowNewAgentModal(true)}
        >
          + New Agent
        </button>

        {loading ? (
          <div className="text-center py-8">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No agents found. Create your first agent!
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Agents Section */}
            <div>
              <h2 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">
                My Agents ({myAgents.length})
              </h2>
              {myAgents.length === 0 ? (
                <div className="text-center py-4 text-gray-400 bg-gray-800 rounded">
                  You haven't created any agents yet
                </div>
              ) : (
                renderAgentsList(myAgents, true)
              )}
            </div>

            {/* Shared With Me Section */}
            <div>
              <h2 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">
                Shared With Me ({sharedWithMe.length})
              </h2>
              {sharedWithMe.length === 0 ? (
                <div className="text-center py-4 text-gray-400 bg-gray-800 rounded">
                  No agents have been shared with you
                </div>
              ) : (
                renderAgentsList(sharedWithMe, false)
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Agent Modal */}
      {showNewAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Agent</h2>
            <form onSubmit={handleCreateAgent}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newAgent.description}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  rows="3"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewAgentModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



