import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const BRL = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const driveFolderEmbed = (folderId, view = "list") =>
  `https://drive.google.com/embeddedfolderview?id=${folderId}#${view}`;

export const drivePreview = (fileId) =>
  `https://drive.google.com/file/d/${fileId}/preview`;
