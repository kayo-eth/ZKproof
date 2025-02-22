import { R1CS } from "./r1cs.js";
import { QAP } from "./qap.js";
import { SNARK } from "./snark.js";
import * as circomlibjs from "circomlibjs";
import { utils } from "ffjavascript";

class ZKProofSystem {
    constructor(debug = false) {
        this.r1cs = new R1CS();
        this.debug = debug;
        this.poseidon = null;
        this.constraintsSet = false; 
    }

    async setupPoseidon() {
        if (!this.poseidon) {
            console.log("🔹 Initializing Poseidon Hash Function...");
            this.poseidon = await circomlibjs.buildPoseidon();
        }
    }

    async setupConstraints(witnessCount) {
        if (typeof witnessCount !== "number" || witnessCount < 1) {
            throw new Error("❌ ERROR: Witness count must be a positive integer.");
        }

        console.log(`\n🛠 Setting up constraints for ${witnessCount} witnesses...`);

        let witnessVars = [];
        for (let i = 1; i <= witnessCount; i++) {
            let witness = await this.r1cs.addVariable(`x${i}`);
            witnessVars.push(witness);
        }

        let y = await this.r1cs.addVariable("y");

        console.log(`🔹 Witness variables: ${witnessVars.join(", ")}`);
        console.log(`🔹 Output variable: ${y}`);

        await this.r1cs.addHashConstraint(witnessVars, y);

        this.constraintsSet = true; 
        console.log("✅ R1CS Constraints Set for Multi-Witness H(x1, x2, ..., xn) = y");
    }

    async generateProof(inputs, secret = null, previousProof = null) {
        console.log("\n🚀 [START] Generating zk-SNARK Proof...");

        if (!Array.isArray(inputs) || inputs.some(i => typeof i !== "number" || isNaN(i))) {
            throw new Error("❌ ERROR: Inputs must be an array of valid numbers.");
        }

        console.log(`🔹 Received witness values: ${inputs.join(", ")}`);

        try {
            await this.setupPoseidon();
            if (!this.constraintsSet) {
                await this.setupConstraints(inputs.length);
            }

            const babyJub = await circomlibjs.buildBabyjub();
            console.log("🔹 BabyJub curve initialized for hashing.");

           
            const hashedInput = utils.leBuff2int(this.poseidon(inputs));
            console.log(`🔹 Computed Hash: H(${inputs.join(", ")}) = ${hashedInput}`);

           
            let commitment = null;
            if (secret !== null) {
                commitment = utils.leBuff2int(this.poseidon([...inputs, secret]));
                console.log(`🔹 Commitment Generated: Poseidon(${inputs.join(", ")}, secret) = ${commitment}`);
            }

            let qap = new QAP(this.r1cs); 
            let snark = new SNARK(qap, this.debug);
            let proof = await snark.generateProof(inputs, previousProof);

            console.log("\n✅ [END] Proof Generated!");
            console.log("🔹 Proof Structure:", JSON.stringify(proof, null, 2));

            return { proof, output: hashedInput, commitment }; 
        } catch (error) {
            console.error("❌ ERROR: Failed to generate proof.", error);
            return null;
        }
    }

    async verifyProof({ proof, output, commitment = null }, inputs, secret = null) {
        console.log("\n🔍 [START] Verifying zk-SNARK Proof...");

        if (!Array.isArray(inputs) || inputs.some(i => typeof i !== "number" || isNaN(i))) {
            console.error("❌ ERROR: Invalid inputs. Must be an array of numbers.");
            return false;
        }

        if (!proof || output === undefined) {
            console.error("❌ ERROR: Invalid proof format.");
            return false;
        }

        console.log(`🔹 Witness inputs for verification: ${inputs.join(", ")}`);

        try {
            await this.setupPoseidon(); 
            const babyJub = await circomlibjs.buildBabyjub();
            console.log("🔹 BabyJub curve initialized for verification.");

            
            const expectedHashedInput = utils.leBuff2int(this.poseidon(inputs));

            if (expectedHashedInput !== output) {
                console.error(`❌ ERROR: Hash mismatch! Computed: ${expectedHashedInput}, Expected: ${output}`);
                return false;
            }

            console.log(`🔹 Hash Match Verified: H(${inputs.join(", ")}) = ${expectedHashedInput}`);

            
            if (commitment !== null && secret !== null) {
                const expectedCommitment = utils.leBuff2int(this.poseidon([...inputs, secret]));
                if (expectedCommitment !== commitment) {
                    console.error(`❌ ERROR: Commitment mismatch! Computed: ${expectedCommitment}, Expected: ${commitment}`);
                    return false;
                }
                console.log(`🔹 Commitment Verified: Poseidon(${inputs.join(", ")}, secret) = ${expectedCommitment}`);
            }

            let qap = new QAP(this.r1cs);
            let snark = new SNARK(qap, this.debug);
            let isValid = await snark.verifyProof(proof, inputs);

            console.log(isValid ? "✅ [END] Proof is VALID!" : "❌ [END] Proof verification FAILED.");
            return isValid;
        } catch (error) {
            console.error("❌ ERROR: Proof verification failed.", error);
            return false;
        }
    }
}

export { ZKProofSystem };
