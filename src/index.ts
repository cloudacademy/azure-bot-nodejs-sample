// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { startServer } from '@microsoft/agents-hosting-express'
import { TurnState, MemoryStorage, TurnContext, AgentApplication, AttachmentDownloader }
  from '@microsoft/agents-hosting'
import { ActivityTypes } from '@microsoft/agents-activity'

const subscriptionKey = 'YOUR_KEY'
const endpoint = 'YOUR_ENDPOINT'
const apiPath = '/language/:analyze-text?api-version=2022-05-01'
const welcomeText = 'Hi! How is your day going?'
const greetingPattern = /^(hi|hello|hey|good morning|good afternoon|good evening)$/i

// Create custom conversation state properties.  This is
// used to store customer properties in conversation state.
interface ConversationState {
  count: number;
}
type ApplicationTurnState = TurnState<ConversationState>

interface SentimentResponse {
  results?: {
    documents?: Array<{
      confidenceScores?: {
        positive?: number;
      };
    }>;
  };
}

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
    await context.sendActivity(`[${count}] Say something and I will analyze the sentiment.`)
    return
  }

  if (greetingPattern.test(userText)) {
    await context.sendActivity(`[${count}] ${welcomeText}`)
    return
  }

  try {
    const documents = {
      documents: [
        {
          id: '1',
          language: 'en',
          text: userText
        }
      ]
    }

    const response = await fetch(`${endpoint}${apiPath}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kind: 'SentimentAnalysis',
        analysisInput: documents
      })
    })

    const data = await response.json() as SentimentResponse
    const positive = data?.results?.documents?.[0]?.confidenceScores?.positive ?? 0

    const reply = (
      positive > 0.8 ? "You sound happy! I'm glad to hear that!" :
      positive > 0.2 ? 'Sounds like a pretty good day so far.' :
      "You don't sound very happy. Sorry to hear that!"
    )

    await context.sendActivity(`[${count}] ${reply}`)
  } catch (error) {
    console.error('Sentiment analysis failed:', error)
    await context.sendActivity(`[${count}] I could not analyze that message right now.`)
  }
})

startServer(agentApp)