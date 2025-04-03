import { useState, useRef } from "react";
import { User, Cpu, MessageSquare } from "lucide-react";
import Navbar from "../components/NavBar";

const agents = [
  { name: "Marketing Assistant", description: "Assists with marketing tasks." },
  { name: "Customer Support Bot", description: "Handles customer inquiries." },
  { name: "Code Helper", description: "Provides programming assistance." },
  { name: "Travel Planner", description: "Creates personalized trip itineraries." },
];

export default function AiAgents() {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <Navbar />
      {/* Content */}
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">AI Agents</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4 w-full sm:w-auto">
          + New Agent
        </button>
        <div className="space-y-4">
          {agents.map((agent, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <Cpu className="w-8 h-8 text-blue-500" />
                <div>
                  <h2 className="text-lg font-semibold">{agent.name}</h2>
                  <p className="text-gray-400">{agent.description}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto mt-4 sm:mt-0">
                <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded w-full sm:w-auto flex items-center justify-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded w-full sm:w-auto">Add data</button>
                <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded hover:bg-gray-600 w-full sm:w-auto">Share</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



