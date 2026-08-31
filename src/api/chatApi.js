import { httpClient } from './httpClient.js';

export const chatApi = {
  /**
   * Envia consulta ao Chat de IA v2 (validada pelo QueryPolicyService).
   */
  async sendQuery({ sql, signal }) {
    const response = await httpClient('/api/v2/chat/query', {
      method: 'POST',
      body: JSON.stringify({ sql }),
      signal
    });
    return response.data;
  }
};
