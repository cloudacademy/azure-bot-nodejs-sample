// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { startServer } from '@microsoft/agents-hosting-express'
import { TurnState, MemoryStorage, TurnContext, AgentApplication, AttachmentDownloader }
  from '@microsoft/agents-hosting'
import { ActivityTypes } from '@microsoft/agents-activity'

const welcomeText = 'Hi! How is your day going?'
const greetingPattern = /^(hi|hello|hey|good morning|good afternoon|good evening)$/i
// Create custom conversation state properties.  This is
// used to store customer properties in conversation state.
interface ConversationState {
  count: number;
}
type ApplicationTurnState = TurnState<ConversationState>

// Register IStorage.  For development, MemoryStorage is suitable.
// For production Agents, persisted storage should be used so
// that state survives Agent restarts, and operates correctly
// in a cluster of Agent instances.
const storage = new MemoryStorage()

const downloader = new AttachmentDownloader()

const agentApp = new AgentApplication<ApplicationTurnState>({
  storage,
  fileDownloaders: [downloader]
})

// Display a welcome message when members are added
agentApp.onConversationUpdate('membersAdded', async (context: TurnContext, state: ApplicationTurnState) => {
  await context.sendActivity(welcomeText)
})

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
agentApp.onActivity(ActivityTypes.Message, async (context: TurnContext, state: ApplicationTurnState) => {
  // Increment count state
  let count = state.conversation.count ?? 0
  state.conversation.count = ++count

  const userText = context.activity.text?.trim()

  if (!userText) {
    await context.sendActivity(`[${count}] I could not analyze that message right now.`)
    return
  }

  if (greetingPattern.test(userText)) {
    await context.sendActivity(`[${count}] ${welcomeText}`)
    return
  }

  await context.sendActivity(`[${count}] I could not analyze that message right now.`)
})

startServer(agentApp)
