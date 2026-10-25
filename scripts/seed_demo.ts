import { ensureDemoAccount, DEMO_CONFIG } from "../src/lib/auth/demo-account";

async function main() {
  console.log("[*] Seeding restricted demonstration account...");
  console.log(`    Target Email: ${DEMO_CONFIG.EMAIL}`);
  console.log(`    Initial Balance: ${DEMO_CONFIG.INITIAL_CREDITS} demo credits`);

  try {
    const user = await ensureDemoAccount();
    console.log(`[+] Demo account provisioned successfully (User ID: ${user.id}).`);
  } catch (error) {
    console.error("[-] Failed to provision demo account:", error);
    process.exit(1);
  }
}

main();
