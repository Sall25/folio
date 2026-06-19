import type { ID, Person } from "src/types";
import { http } from "./client";

export const fetchPeople = () => http<Person[]>("/people");

export const fetchPerson = (id: ID) => http<Person>(`/people/${id}`);

export const deletePerson = (id: ID) =>
  http<void>(`/people/${id}`, { method: "DELETE" });

export const patchPerson = (id: ID, patch: Partial<Person>) =>
  http<Person>(`/people/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch }),
  });

export const createPerson = (person: Person) =>
  http<Person>("/people", { method: "POST", body: JSON.stringify(person) });
