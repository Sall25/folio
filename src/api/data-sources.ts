import type { DataSource, ID } from "src/types";
import { http } from "./client";

export const fetchDataSources = () => http<DataSource[]>("/dataSources");

export const fetchDataSource = (id: ID) =>
  http<DataSource>(`/dataSources/${id}`);

export const patchDataSource = (
  sourceId: ID,
  patch: Partial<Omit<DataSource, "id">>,
) =>
  http<DataSource>(`/dataSources/${sourceId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });

export const deleteDataSource = (sourceId: ID) =>
  http<void>(`/dataSources/${sourceId}`, { method: "DELETE" });

export const createDataSource = (dataSource: DataSource) =>
  http<DataSource>("/dataSources", {
    method: "POST",
    body: JSON.stringify(dataSource),
  });
