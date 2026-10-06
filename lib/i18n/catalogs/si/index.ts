import type { Catalog } from "../../translate";
import { client } from "./client";
import { server } from "./server";

export { client };
export const all: Catalog = { ...client, ...server };
