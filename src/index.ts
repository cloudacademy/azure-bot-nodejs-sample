// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { startServer } from '@microsoft/agents-hosting-express'
import { TurnState, MemoryStorage, TurnContext, AgentApplication, AttachmentDownloader }
  from '@microsoft/agents-hosting'
import { ActivityTypes } from '@microsoft/agents-activity'

const welcomeText = 'Hi! How is your day going?'
const greetingPattern = /^(hi|hello|hey|good morning|good afternoon|good evening)$/i
const thanksPattern = /^(thanks|thank you|thx)$/i
const helpPattern = /^(help|\?)$/i

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
    await context.sendActivity(`[${count}] Say something and I will echo it back to you.`)
    return
  }

  if (greetingPattern.test(userText)) {
    await context.sendActivity(`[${count}] ${welcomeText}`)
    return
  }

  if (helpPattern.test(userText)) {
    await context.sendActivity(
      `[${count}] Try saying hello, tell me how your day is going, or send any message and I will echo it back.`
    )
    return
  }

  if (thanksPattern.test(userText)) {
    await context.sendActivity(`[${count}] You're welcome!`)
    return
  }

  await context.sendActivity(`[${count}] You said: ${userText}`)
})

startServer(agentApp)
