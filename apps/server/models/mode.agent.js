import {Schema, model} from "mongoose"

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
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Agent = model("Agent", AgentSchema);
export default Agent;
