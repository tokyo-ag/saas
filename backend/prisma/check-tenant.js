"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const p = new client_1.PrismaClient();
async function main() {
    const t = await p.tenant.findUnique({ where: { id: 'tenant-001' }, select: { id: true, liffEventView: true } });
    console.log(JSON.stringify(t));
}
main().finally(() => p.$disconnect());
//# sourceMappingURL=check-tenant.js.map