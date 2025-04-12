import React from 'react';
import { AuthProvider } from './context/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import { Routes, Route } from 'react-router';
import Home from './pages/Home';
import { Toaster } from 'react-hot-toast';
import Login from "./pages/Login"
import AddDataToAgent from './pages/AddDataToAgent';
import AiAgents from "./pages/AiAgents"
import Chat from './pages/Chat';
import SignUp from './pages/SignUp'
function App() {
  return (
    <div>
  <AuthProvider>
    <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1f2937', // bg-gray-800
            color: '#f9fafb', // text-gray-50
            border: '1px solid #374151', // border-gray-700
          },
          success: {
            iconTheme: {
              primary: '#10B981', // text-green-500
              secondary: '#1f2937', // bg-gray-800
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444', // text-red-500
              secondary: '#1f2937', // bg-gray-800
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={
          <Home/>
           }/>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/aiagents" >
        <Route index element={<ProtectedRoute><AiAgents/></ProtectedRoute>}/> 
        <Route path='addata/:agentId' element = {<AddDataToAgent/>} />
          <Route path=":agentid/chat/:chatid" element={< Chat/>} />
        </Route>
      </Routes>
    </AuthProvider>
    </div>
  );
}

export default App;

