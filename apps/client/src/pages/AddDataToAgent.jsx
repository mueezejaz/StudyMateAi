import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Upload, FileText, Image, X, AlertCircle, CheckCircle, Loader } from "lucide-react";
import axios from "axios";
import Navbar from "../components/NavBar";
import { useAuth } from "../context/Auth";
import toast from "react-hot-toast";

export default function AddDataToAgent() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch agent data
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const [agentResponse, filesResponse] = await Promise.all([
          axios.get(`http://localhost:8000/api/agent/${agentId}`, { withCredentials: true }),
          axios.get(`http://localhost:8000/api/agent/${agentId}/files`, { withCredentials: true })
        ]);
        
        setAgent(agentResponse.data.data.agent);
        setFiles(filesResponse.data.data.files || []);
      } catch (error) {
        toast.error("Failed to load agent data");
        if (error.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    console.log(agentId)
    if (agentId) {
      fetchAgent();
    }
  }, [agentId, navigate]);

  // Poll for file status updates
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (agentId && files.some(file => file.status === 'processing')) {
        try {
          const response = await axios.get(`http://localhost:8000/api/agent/${agentId}/files`, { 
            withCredentials: true 
          });
          setFiles(response.data.data.files || []);
        } catch (error) {
          console.error("Failed to refresh file status", error);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [agentId, files]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList) => {
    setUploadStatus(true);
    const formData = new FormData();
    
    // Validate file types
    let hasInvalidFile = false;
    Array.from(fileList).forEach(file => {
      if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error(`${file.name} is not a valid file type. Only PDF and images are allowed.`);
        hasInvalidFile = true;
      } else {
        formData.append('files', file);
      }
    });
    
    if (hasInvalidFile || formData.getAll('files').length === 0) {
      setUploadStatus(false);
      return;
    }
    
    try {
      const response = await axios.post(
        `http://localhost:8000/api/agent/${agentId}/files`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Add new files to the existing files list
      setFiles(prevFiles => [...prevFiles, ...response.data.data.files]);
      toast.success("Files uploaded successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload files");
    } finally {
      setUploadStatus(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await axios.delete(`http://localhost:8000/api/agent/${agentId}/files/${fileId}`, {
        withCredentials: true
      });
      
      // Remove deleted file from state
      setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
      toast.success("File deleted successfully");
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen">
        <Navbar />
        <div className="p-6 max-w-4xl mx-auto flex justify-center items-center h-64">
          <Loader className="animate-spin text-blue-500 w-8 h-8" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="bg-gray-900 text-white min-h-screen">
        <Navbar />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-gray-800 p-4 rounded flex items-center text-red-400">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>Agent not found or you don't have access.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-gray-400">{agent.description}</p>
          </div>
          <button 
            onClick={() => navigate(`/agents`)} 
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back to Agents
          </button>
        </div>

        {/* File Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-8 ${
            dragActive ? "border-blue-500 bg-blue-500 bg-opacity-10" : "border-gray-600"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Upload Files</h3>
          <p className="text-gray-400 mb-4">Drag and drop PDF or image files here, or click to browse</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer">
            Select Files
            <input 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg" 
              multiple 
              className="hidden" 
              onChange={handleFileChange}
              disabled={uploadStatus}
            />
          </label>
          <p className="text-sm text-gray-400 mt-2">Maximum 5 files, 10MB each</p>
        </div>
        
        {uploadStatus && (
          <div className="flex items-center justify-center mb-4">
            <Loader className="animate-spin text-blue-500 w-6 h-6 mr-2" />
            <span>Uploading files...</span>
          </div>
        )}

        {/* Files List */}
        {files.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <div key={file._id} className="bg-gray-800 rounded-lg p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {file.fileType === 'pdf' ? (
                        <FileText className="w-8 h-8 text-red-400 mr-3" />
                      ) : (
                        <Image className="w-8 h-8 text-green-400 mr-3" />
                      )}
                      <div className="truncate max-w-xs">
                        <p className="font-medium truncate">{file.originalName}</p>
                        <p className="text-sm text-gray-400">{new Date(file.uploadedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {(user && agent.admin === user._id) && (
                      <button 
                        onClick={() => handleDeleteFile(file._id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-auto pt-2 border-t border-gray-700">
                    <div className="flex items-center">
                      {file.status === 'processing' && (
                        <>
                          <Loader className="w-4 h-4 text-yellow-500 animate-spin mr-2" />
                          <span className="text-sm text-yellow-500">Processing...</span>
                        </>
                      )}
                      {file.status === 'completed' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-500">Processed</span>
                        </>
                      )}
                      {file.status === 'failed' && (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                          <span className="text-sm text-red-500">Failed</span>
                        </>
                      )}
                      {file.status === 'uploaded' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm text-blue-500">Uploaded</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <p className="text-gray-400">No files uploaded yet. Add files to enhance your AI agent.</p>
          </div>
        )}
      </div>
    </div>
  );
}
