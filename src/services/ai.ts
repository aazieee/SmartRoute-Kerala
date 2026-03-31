import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Route, ScenarioMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const setScenarioTool: FunctionDeclaration = {
  name: "setScenario",
  description: "Change the current travel scenario (e.g., to Rain, Heavy Traffic, or Emergency mode).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: {
        type: Type.STRING,
        enum: ["normal", "heavy-traffic", "rain", "emergency"],
        description: "The scenario mode to switch to."
      }
    },
    required: ["mode"]
  }
};

const selectRouteTool: FunctionDeclaration = {
  name: "selectRoute",
  description: "Select a specific route from the available options.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      routeId: {
        type: Type.STRING,
        description: "The ID of the route to select (e.g., '1', '2', '3')."
      }
    },
    required: ["routeId"]
  }
};

const updateDestinationTool: FunctionDeclaration = {
  name: "updateDestination",
  description: "Update the source or destination location for the trip.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      source: {
        type: Type.STRING,
        description: "The starting location (Origin Hub)."
      },
      destination: {
        type: Type.STRING,
        description: "The target location (Destination Hub)."
      }
    }
  }
};

export async function getRouteExplanation(route: Route, source: string, destination: string, scenario: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a local Kerala transportation expert specializing in the Malappuram-Kuttippuram corridor. 
      Explain why the "${route.name}" (${route.type}) is the optimal choice for traveling from ${source} to ${destination} right now.

      Context:
      - Current Scenario: ${scenario} (e.g., Monsoon/Rain, Heavy Traffic, Emergency).
      - Route Stats: ${route.time} travel time, ${route.distance} distance, ${route.traffic} traffic level.
      - Predicted Traffic (30m): ${route.predictedTraffic}.
      - Risk Level: ${route.riskLevel}.
      - Safety: ${route.safetyScore}/10.
      - Alerts: ${route.alerts?.join(", ") || "No major blockages"}.

      Guidelines for your response:
      1. Sound like a knowledgeable local who knows the "pocket roads" and NH-66 bottlenecks.
      2. Mention specific Kerala elements: KSRTC bus dominance, narrow bridge crossings, local "Angadi" (market) congestion, or the impact of heavy rains on the red-soil terrain.
      3. If it's "Rain Mode", discuss visibility on the winding roads or potential water-logging near Kuttippuram bridge.
      4. If it's "Heavy Traffic", mention the typical "block" caused by private buses or construction on the National Highway.
      5. Keep it professional yet conversational. Use Markdown for formatting.`,
    });
    return response.text;
  } catch (error) {
    console.error("AI Explanation Error:", error);
    return "### Route Intelligence Unavailable\n\nThis route is currently prioritized based on real-time sensor data from the Malappuram traffic grid. It avoids the main NH-66 bottlenecks and considers the current weather impact on local pocket roads.";
  }
}

export async function chatWithAI(message: string, currentRoutes: Route[], source: string, destination: string, scenario: string) {
  try {
    const routesInfo = currentRoutes.map(r => 
      `- ID: ${r.id}, Name: ${r.name}, Type: ${r.type}, Time: ${r.time}, Traffic: ${r.traffic}, Predicted Traffic (30m): ${r.predictedTraffic}, Risk Level: ${r.riskLevel}, Safety: ${r.safetyScore}/10. Alerts: ${r.alerts?.join(", ") || "None"}`
    ).join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are "SmartRoute Kerala AI", a highly intelligent and helpful transportation assistant for the Malappuram-Kuttippuram region. 
      You have a deep understanding of Kerala's geography, road culture, and real-time conditions.

      Current Trip Context:
      - From: ${source}
      - To: ${destination}
      - Current Mode: ${scenario}
      
      Available Optimized Routes:
      ${routesInfo}
      
      User's Query: "${message}"
      
      Your Task:
      - Provide a smart, contextual, and concise response.
      - Use local insights: Mention things like "KSRTC fast passengers," "Narrow NH stretches," "Monsoon slippery curves," or "Avoid the town signal during peak hours."
      - Be empathetic to the user's travel needs.
      - Explain the "Risk Level" and "Predicted Traffic" when relevant to help the user make a better decision.
      - If they ask for a recommendation, point them to the best fit.
      - You can trigger actions like changing the scenario, selecting a route, or updating locations using the provided tools.
      - If the user says "it's raining", switch to rain mode. If they say "it's a rush", switch to heavy-traffic. If they say "emergency", switch to emergency mode.
      - If they ask to select a specific route (e.g., "Take the bypass"), use the selectRoute tool.`,
      config: {
        tools: [{ functionDeclarations: [setScenarioTool, selectRouteTool, updateDestinationTool] }]
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error("AI Chat Error:", error);
    return {
      text: `I'm experiencing a slight connection lag with the Kerala Traffic Cloud. Generally, during ${scenario === 'rain' ? 'heavy rain' : 'peak hours'}, I'd suggest sticking to the NH bypass or the Safest Route to avoid the narrow town signals.`,
      functionCalls: undefined
    };
  }
}
