import axios from 'axios';

export interface InspectResponse {
  url: string;
  cachedAt: number;
  data: any;
  thumbnailPath?: string;
}

export async function inspect(url: string) {
  const { data } = await axios.get<InspectResponse>('/api/inspect', { params: { url } });
  return data;
}

export async function startDownload(payload: any) {
  const { data } = await axios.post('/api/download', payload);
  return data;
}

export async function fetchJobs() {
  const { data } = await axios.get('/api/jobs');
  return data;
}

export async function fetchJob(id: string) {
  const { data } = await axios.get(`/api/jobs/${id}`);
  return data;
}

export async function requestDownloadUrl(id: string) {
  const { data } = await axios.get(`/api/jobs/${id}/download`);
  return data;
}

export async function getHealth() {
  const { data } = await axios.get('/api/health');
  return data;
}
