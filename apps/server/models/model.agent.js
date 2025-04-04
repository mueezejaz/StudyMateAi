import {Schema, model} from "mongoose"

const FileSchema = new Schema({
  filename: { 
    type: String, 
    required: true 
  },
  originalName: {
    type: String,
    required: true
  },
  path: { 
    type: String, 
    required: true 
  },
  fileType: { 
    type: String, 
    enum: ['pdf', 'png', 'jpg', 'jpeg'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['uploaded', 'processing', 'completed', 'failed'], 
    default: 'uploaded' 
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const AgentSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  admin: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sharedWith: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  files: [FileSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Agent = model("Agent", AgentSchema);
export default Agent;
