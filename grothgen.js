#!/usr/bin/env node
import fs from "fs";
import { Groth16 } from "./groth16.js";

const args = process.argv.slice(2);

async function main() {
    if (args.length === 0) {
        console.log("Usage:");
        console.log("  node grothgen.js setup");
        console.log("  node grothgen.js generate <witness1> <witness2> ...");
        console.log("  node grothgen.js verify <witness1> <witness2> ...");
        process.exit(1);
    }

    const command = args[0];

    if (command === "setup") {
        setupTrustedSetup();
    } else {
        if (!fs.existsSync("trusted_setup.json")) {
            console.error("❌ ERROR: Trusted setup not found! Run `node grothgen.js setup` first.");
            process.exit(1);
        }

        const zkSystem = new Groth16(); 

        if (command === "generate") {
            if (args.length < 2) {
                console.error("❌ ERROR: Missing witness values for proof generation.");
                process.exit(1);
            }

            const witnesses = args.slice(1).map(x => {
                try {
                    return BigInt(x);
                } catch (e) {
                    console.error(`❌ ERROR: Invalid witness value: ${x}`);
                    process.exit(1);
                }
            });

            console.log(`🚀 [Groth16] Generating proof for witnesses: ${witnesses.join(", ")}`);

            const proof = zkSystem.generateProof(witnesses);
            if (!proof) {
                console.error("❌ ERROR: Proof generation failed.");
                process.exit(1);
            }

            console.log("\n✅ [Groth16] Proof successfully generated!");
            console.log("🔹 Proof Structure:", JSON.stringify(proof, (key, value) =>
                typeof value === "bigint" ? value.toString() : value, 2));

          
            fs.writeFileSync("proof.json", JSON.stringify(proof, (key, value) =>
                typeof value === "bigint" ? value.toString() : value, 2));

            console.log("✅ Proof saved to `proof.json`");
        }

        else if (command === "verify") {
            if (args.length < 2) {
                console.error("❌ ERROR: Missing witness values for verification.");
                process.exit(1);
            }

            const witnesses = args.slice(1).map(x => {
                try {
                    return BigInt(x);
                } catch (e) {
                    console.error(`❌ ERROR: Invalid witness value: ${x}`);
                    process.exit(1);
                }
            });

            if (!fs.existsSync("proof.json")) {
                console.error("❌ ERROR: Proof file not found! Generate a proof first.");
                process.exit(1);
            }

            let proofData;
            try {
                proofData = JSON.parse(fs.readFileSync("proof.json"));
            } catch (e) {
                console.error("❌ ERROR: Failed to parse proof.json. It may be corrupted.");
                process.exit(1);
            }

          
            if (!proofData.A || !proofData.B || !proofData.C || !proofData.witnesses) {
                console.error("❌ ERROR: Proof is missing required values! Check proof.json.");
                process.exit(1);
            }

            console.log("\n🔍 [Groth16] Verifying Proof...");
            console.log("🔹 Proof Data:", JSON.stringify(proofData, null, 2));
            console.log("🔹 Witnesses for verification:", witnesses);

            const isValid = zkSystem.verifyProof(proofData, witnesses);
            console.log(isValid ? "✅ Proof is valid!" : "❌ Proof verification failed.");
        }

        else {
            console.error("❌ ERROR: Unknown command.");
            process.exit(1);
        }
    }
}

function setupTrustedSetup() {
    console.log("\n🔹 Generating Trusted Setup...");

    const A = BigInt("353736766909184192") * BigInt(10);
    const B = BigInt("635062968516021376") * BigInt(10);
    const C = BigInt("592282585571711104") * BigInt(10);

    const trustedSetup = {
        A: A.toString(),
        B: B.toString(),
        C: C.toString(),
    };

    fs.writeFileSync("trusted_setup.json", JSON.stringify(trustedSetup, null, 2));
    console.log("✅ Trusted setup generated successfully! Saved as `trusted_setup.json`.");
}

main();
