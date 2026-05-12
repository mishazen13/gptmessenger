// api.ts

import { MessageAttachment } from '../types';

const API_BASE_URL = 'http://192.168.1.104:4000';


export const api = async <T,>(url: string, options: RequestInit = {}, token?: string): Promise<T> => {
  // Определяем, нужно ли использовать FormData
  const isFormData = options.body instanceof FormData;
  
  // Формируем полный URL
  const requestUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const headers: HeadersInit = {};
  
  // Для FormData не устанавливаем Content-Type (браузер сам добавит с границей)
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Server error: ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
};

// Загрузка файлов через чанки
export const uploadFileChunked = async (file: File, token: string): Promise<MessageAttachment> => {
  // 1. Начинаем загрузку
  const started = await api<{ uploadId: string }>('/api/uploads/chunk/start', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
  }, token);

  // 2. Отправляем чанки (по 5MB)
  const CHUNK_SIZE = 5 * 1024 * 1024;
  let offset = 0;
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const chunkBuffer = await chunk.arrayBuffer();
    
    await fetch(`${API_BASE_URL}/api/uploads/chunk/${started.uploadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${token}`,
      },
      body: chunkBuffer,
    });
    
    offset += chunk.size;
  }

  // 3. Завершаем загрузку
  const finished = await api<{ file: MessageAttachment }>(`/api/uploads/chunk/${started.uploadId}/finish`, {
    method: 'POST',
  }, token);
  
  return finished.file;
};