import { getProvider, providerRequest, ServiceError } from './providerService';

export class AIService {
  public async generateReply(userPrompt: string, signal: AbortSignal): Promise<string> {
    const data = await providerRequest('/chat/completions', JSON.stringify({
      model: getProvider().chatModel,
      messages: [
        { role: 'system', content: 'You are Melen, a friendly 3D robot companion. Reply in one to three short spoken sentences. Do not claim to perform actions outside this conversation.' },
        { role: 'user', content: userPrompt },
      ],
    }), signal, true) as { choices?: { message?: { content?: unknown } }[] };
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new ServiceError('The provider returned an empty reply. Please retry.');
    return reply.trim();
  }
}
export const aiService = new AIService();
