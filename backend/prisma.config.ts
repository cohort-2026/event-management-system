import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  schema: "prisma/schema.prisma",
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
