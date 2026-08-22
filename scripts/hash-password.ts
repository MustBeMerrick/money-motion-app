// Generates the AUTH_PASSWORD_HASH value for the server env file.
//   npm run auth:hash
// Type the password when prompted; it is not echoed, not stored, and not
// sent anywhere -- only the salted scrypt hash is printed.
import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/auth/password";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // swallow echo so the password never lands in the scrollback
  const output = rl as unknown as { output: NodeJS.WriteStream; _writeToOutput: (s: string) => void };
  output._writeToOutput = (s: string) => {
    if (s.includes(question)) output.output.write(s);
  };
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    }),
  );
}

// no top-level await: tsx transpiles this package's .ts as CJS
async function main() {
  const password = await prompt("New password: ");
  if (password.length < 8) {
    console.error("Use at least 8 characters.");
    process.exit(1);
  }

  console.log("\nAdd these two lines to ~/apps/money-motion-app/env on the server:\n");
  console.log(`AUTH_PASSWORD_HASH=${hashPassword(password)}`);
  console.log(`AUTH_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
  console.log("\nThen: deploy/deploy.sh restart");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
