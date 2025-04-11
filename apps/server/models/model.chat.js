import {Schema, model} from "mongoose"

const MessageSchema = new Schema({
  role: { 
    type: String, 
    enum: ['user', 'assistant', 'system'],
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const ChatSchema = new Schema({
  title: { 
    type: String, 
    required: true 
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  threadId: {
    type: String,
    required: true
  },
  messages: [MessageSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
ChatSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

const Chat = model("Chat", ChatSchema);
export default Chat;