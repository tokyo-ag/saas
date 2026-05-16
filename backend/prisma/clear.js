"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const p = new client_1.PrismaClient();
async function main() {
    await p.message.deleteMany({});
    await p.connection.deleteMany({});
    await p.reservation.deleteMany({});
    await p.member.deleteMany({});
    await p.event.deleteMany({});
    await p.organizerAccount.deleteMany({});
    await p.tenant.deleteMany({});
    console.log('cleared');
}
main().catch(console.error).finally(() => p.$disconnect());
//# sourceMappingURL=clear.js.map