import crypto from "crypto";
import * as circomlibjs from "circomlibjs";
import { utils } from "ffjavascript";

class SNARK {
    constructor(qap, debug = false) {
        this.qap = qap;
        this.debug = debug;

        
        this.secret = crypto.randomBytes(32).toString("hex");
        this.commitment = crypto.createHash("sha256").update(this.secret).digest("hex");

        if (this.debug) console.log("🔐 SNARK Commitment Created:", this.commitment);
    }

    async generateProof(inputs, previousProof = null) {
        console.log("\n🚀 SNARK: Generating proof for multiple witnesses...");

        if (!Array.isArray(inputs) || inputs.some(i => typeof i !== "number" || isNaN(i))) {
            throw new Error("❌ ERROR: Invalid inputs. Must be an array of numbers.");
        }

        console.log("🔹 Input witnesses received:", inputs);

        if (!this.qap || !Array.isArray(this.qap.polynomials) || this.qap.polynomials.length === 0) {
            throw new Error("❌ ERROR: Invalid QAP. Polynomials are missing.");
        }

        try {
            const babyJub = await circomlibjs.buildBabyjub();
            const F = babyJub.F;

        
            const hashedInput = utils.leBuff2int(await circomlibjs.poseidon(inputs));
            console.log("🔹 Computed H(x1, x2, ..., xn):", hashedInput);

            const proof = this.qap.polynomials.map((f) => {
                let result = f(hashedInput);
                if (typeof result !== "number" || isNaN(result)) {
                    throw new Error("❌ ERROR: Polynomial evaluation returned an invalid value.");
                }
                if (this.debug) console.log(`🔍 SNARK Polynomial Evaluation: f(H(x1, x2, ..., xn)) = ${result}`);
                return result;
            });

            const recursiveProof = {
                proof,
                hash: crypto.createHash("sha256").update(JSON.stringify(proof)).digest("hex"), 
                previousProof, 
                hashedInput, 
            };

            console.log("✅ SNARK Multi-Witness Proof Generated:", JSON.stringify(recursiveProof, null, 2));
            return recursiveProof;

        } catch (error) {
            console.error("❌ ERROR: Proof generation failed.", error.message);
            return null;
        }
    }

    async verifyProof(proof, inputs) {
        console.log("\n🔍 SNARK: Verifying multi-witness proof...");

        if (!Array.isArray(inputs) || inputs.some(i => typeof i !== "number" || isNaN(i))) {
            throw new Error("❌ ERROR: Invalid inputs. Must be an array of numbers.");
        }

        if (!proof || !Array.isArray(proof.proof)) {
            console.error("❌ ERROR: Invalid proof format.");
            return false;
        }

        if (!this.qap || !Array.isArray(this.qap.polynomials) || this.qap.polynomials.length === 0) {
            throw new Error("❌ ERROR: Invalid QAP. Polynomials are missing.");
        }

        try {
            const babyJub = await circomlibjs.buildBabyjub();
            const F = babyJub.F;

            
            const expectedHashedInput = utils.leBuff2int(await circomlibjs.poseidon(inputs));

            if (expectedHashedInput !== proof.hashedInput) {
                console.error("❌ ERROR: Hash mismatch! Proof does not correspond to input witnesses.");
                return false;
            }

            console.log("🔹 Verified H(x1, x2, ..., xn):", expectedHashedInput);

            const isValid = this.qap.polynomials.every((f, index) => {
                let expected = f(expectedHashedInput);
                let received = proof.proof[index];

              
                
                let expectedHash = crypto.createHash("sha256").update(String(expected)).digest("hex");
                let receivedHash = crypto.createHash("sha256").update(String(received)).digest("hex");

                if (this.debug) {
                    console.log(`🔍 Expected Hash: ${expectedHash}`);
                    console.log(`🔍 Received Hash: ${receivedHash}`);
                }

                return expectedHash === receivedHash;
            });

          
            if (proof.previousProof) {
                console.log("\n🔍 Verifying Recursive SNARK Proof...");
                if (!this.verifyProof(proof.previousProof, inputs)) {
                    console.error("❌ ERROR: Recursive proof is invalid!");
                    return false;
                }
            }

            console.log(isValid ? "✅ Multi-Witness Proof is valid!" : "❌ Proof verification failed!");
            return isValid;

        } catch (error) {
            console.error("❌ ERROR: Proof verification failed.", error.message);
            return false;
        }
    }
}

export { SNARK };
