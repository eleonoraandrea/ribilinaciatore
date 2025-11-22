import { GoogleGenAI } from "@google/genai";
import { Asset, RebalanceResult, Exchange } from "../types";

const SYSTEM_INSTRUCTION = `
Sei un consulente finanziario esperto di crypto e rebalancing algoritmico. 
Parli italiano.
Analizza i dati del portafoglio forniti dall'utente.
Spiega brevemente perché il ribilanciamento è necessario o meno.
Se è necessario un ribilanciamento, commenta la volatilità del mercato che potrebbe averlo causato (inventa una narrativa plausibile basata sui prezzi).
Sii conciso, professionale ma colloquiale.
Non dare consigli finanziari reali, ma spiega la logica matematica.
`;

export const getGeminiAnalysis = async (
  assets: Asset[],
  rebalanceResult: RebalanceResult,
  exchange: Exchange
): Promise<string> => {
  
  if (!process.env.API_KEY) {
    return "Chiave API Gemini non trovata. Assicurati di averla configurata.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
    Exchange: ${exchange}
    Deviazione Massima Attuale: ${rebalanceResult.deviation.toFixed(2)}%
    Soglia Trigger: Richiesto se > soglia configurata.
    Stato Ribilanciamento: ${rebalanceResult.needsRebalance ? "NECESSARIO" : "NON NECESSARIO"}
    
    Asset Dati:
    ${assets.map(a => `- ${a.symbol}: Prezzo $${a.price.toFixed(2)}, Bilancio attule ${a.balance.toFixed(4)}, Target ${a.targetAllocation}%`).join('\n')}
    
    Azioni Proposte:
    ${rebalanceResult.actions.map(a => `- ${a.side} ${a.symbol} per $${a.usdValue.toFixed(2)}`).join('\n')}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "Non sono riuscito a generare un'analisi al momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore di connessione con Gemini AI. Riprova più tardi.";
  }
};