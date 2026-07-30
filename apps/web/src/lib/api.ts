/** API 基址统一入口：部署环境用 VITE_API_BASE，开发默认本机 3001 */
export const API_BASE: string =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE) || 'http://localhost:3001/api';
