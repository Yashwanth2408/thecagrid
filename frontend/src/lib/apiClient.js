import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export async function apiGet(path) {
  const r = await api.get(path);
  return r.data;
}

export async function apiPost(path, body) {
  const r = await api.post(path, body);
  return r.data;
}
