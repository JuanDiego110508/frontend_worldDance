
const apiUrlOverride = typeof localStorage !== 'undefined' ? localStorage.getItem('apiUrl') : null;

const agentApiUrlOverride = typeof localStorage !== 'undefined' ? localStorage.getItem('agentApiUrl') : null;

export const environment = {
  production: false,
  apiUrl: apiUrlOverride || 'https://api.worlddance.win/api/v1',
  agentApiUrl: agentApiUrlOverride || 'https://api.worlddance.win/api/v1/agent'
};
