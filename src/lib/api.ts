// api.ts

import { MessageAttachment } from '../types';

const API_BASE_URL =
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://192.168.1.104:4000');

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

// Загрузка файлов через чанки (исправленная версия)
export const uploadFileChunked = async (file: File, token: string): Promise<MessageAttachment> => {
  console.log('📤 uploadFileChunked started:', file.name, file.type, file.size);
  
  // 1. Начинаем загрузку
  const started = await api<{ uploadId: string }>('/api/uploads/chunk/start', {
    method: 'POST',
    body: JSON.stringify({ 
      name: file.name, 
      type: file.type || getMimeType(file.name), 
      size: file.size 
    }),
  }, token);

  console.log('📤 Upload started with ID:', started.uploadId);

  // 2. Отправляем чанки (по 1MB для лучшей совместимости с медиа)
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  let offset = 0;
  let chunkIndex = 0;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const chunkBuffer = await chunk.arrayBuffer();
    
    console.log(`📤 Uploading chunk ${chunkIndex + 1}/${totalChunks}, size: ${chunk.size} bytes`);
    
    const chunkResponse = await fetch(`${API_BASE_URL}/api/uploads/chunk/${started.uploadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${token}`,
        'X-Chunk-Index': String(chunkIndex),
        'X-Total-Chunks': String(totalChunks),
      },
      body: chunkBuffer,
    });
    
    if (!chunkResponse.ok) {
      const payload = (await chunkResponse.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Chunk upload failed: ${chunkResponse.status}`);
    }
    
    offset += chunk.size;
    chunkIndex++;
  }

  console.log('📤 All chunks uploaded, finishing...');

  // 3. Завершаем загрузку
  const finished = await api<{ file: MessageAttachment }>(`/api/uploads/chunk/${started.uploadId}/finish`, {
    method: 'POST',
  }, token);
  
  console.log('✅ Upload completed:', finished.file);
  return finished.file;
};

// Вспомогательная функция для определения MIME типа по расширению файла
const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    // Изображения
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    
    // Видео
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg',  // Изменено с 'ogg' на 'ogv' для видео
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    
    // Аудио
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'oga': 'audio/ogg',  // Изменено с 'ogg' на 'oga' для аудио
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    'opus': 'audio/opus',
    
    // Документы
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    
    // Архивы
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

// Альтернативная функция для загрузки через FormData (для маленьких файлов)
export const uploadFileSimple = async (file: File, token: string): Promise<MessageAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('type', file.type || getMimeType(file.name));
  
  const response = await api<{ file: MessageAttachment }>('/api/uploads/simple', {
    method: 'POST',
    body: formData,
  }, token);
  
  return response.file;
};

// Функция для проверки, является ли файл медиа (изображение или видео)
export const isMediaFile = (file: File): boolean => {
  const mediaTypes = ['image/', 'video/'];
  return mediaTypes.some(type => file.type.startsWith(type));
};

// Функция для проверки, является ли файл изображением
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

// Функция для проверки, является ли файл видео
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

// Функция для проверки, является ли файл аудио
export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/');
};