
import { RebalanceAction, Exchange } from "../types";

export const sendTelegramMessage = async (token: string, chatId: string, text: string): Promise<boolean> => {
  if (!token || !chatId) return false;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return response.ok;
  } catch (e) {
    console.error("Telegram Send Error", e);
    return false;
  }
};

export const formatRebalanceMessage = (
  exchange: Exchange,
  deviation: number,
  actions: RebalanceAction[],
  isAutoExecuted: boolean
): string => {
  const header = isAutoExecuted 
    ? `🤖 <b>AUTO-TRADE EXECUTED</b>` 
    : `⚠️ <b>MANUAL REBALANCE SIGNAL</b>`;

  const actionLines = actions.map(a => 
    `${a.side === 'BUY' ? '🟢' : '🔴'} <b>${a.side} ${a.symbol}</b>\n   Amount: ${a.amount.toFixed(4)}\n   Value: $${a.usdValue.toFixed(2)}`
  ).join('\n\n');

  return `
${header}
Exchange: ${exchange}
Deviation: <b>${deviation.toFixed(2)}%</b>

<b>Actions Required:</b>
${actionLines}

<i>Check dashboard for details.</i>
`;
};
