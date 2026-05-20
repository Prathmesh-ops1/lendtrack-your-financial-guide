import { createServerFn } from "@tanstack/react-start";
import { createVerifiedUser, CreateVerifiedUserArgs } from "./admin.server";

export const createVerifiedUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreateVerifiedUserArgs) => data)
  .handler(async ({ data }) => {
    return createVerifiedUser(data);
  });
