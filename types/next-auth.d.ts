import NextAuth, { DefaultSession } from "//";

declare module "//" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "///jwt" {
  interface JWT {
    id: string;
  }
}
