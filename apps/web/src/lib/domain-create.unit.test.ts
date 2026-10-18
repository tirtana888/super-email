import { describe, expect, it } from "vitest";
import { normalizeDomainName } from "./domain-name";
import { runWithRollback } from "./rollback";

describe("normalizeDomainName", () => {
  it("lowercases the name, which is what SES stores", () => {
    expect(normalizeDomainName("Nusadayaacademy.com")).toBe("nusadayaacademy.com");
    expect(normalizeDomainName("Send.Example.COM")).toBe("send.example.com");
  });

  it("trims spaces and trailing dots", () => {
    expect(normalizeDomainName("  example.com  ")).toBe("example.com");
    expect(normalizeDomainName("example.com.")).toBe("example.com");
  });

  it("leaves a clean name unchanged", () => {
    expect(normalizeDomainName("mail.example.co.id")).toBe("mail.example.co.id");
  });
});

describe("runWithRollback", () => {
  it("returns the result and does not roll back when the action succeeds", async () => {
    let rolledBack = false;

    const result = await runWithRollback(
      async () => "ok",
      async () => {
        rolledBack = true;
      },
    );

    expect(result).toBe("ok");
    expect(rolledBack).toBe(false);
  });

  it("rolls back once and rethrows the original error when the action fails", async () => {
    let rollbacks = 0;
    const original = new Error("MAIL FROM rejected");

    let thrown: unknown;
    try {
      await runWithRollback(
        async () => {
          throw original;
        },
        async () => {
          rollbacks += 1;
        },
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(original);
    expect(rollbacks).toBe(1);
  });

  it("still throws the original error when the rollback itself fails", async () => {
    const original = new Error("db write failed");

    let thrown: unknown;
    try {
      await runWithRollback(
        async () => {
          throw original;
        },
        async () => {
          throw new Error("cleanup failed");
        },
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(original);
  });
});
