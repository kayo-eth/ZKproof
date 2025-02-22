import { utils } from "ffjavascript";
import * as circomlibjs from "circomlibjs";


function ensureBigInt(value, q) {
    if (typeof value === "bigint") {
        return value % q;
    } else if (typeof value === "number") {
        return BigInt(value) % q;
    } else if (typeof value === "string") {
        return BigInt(value) % q;
    } else {
        throw new Error(`❌ ERROR: Invalid value type (${typeof value}): ${value}`);
    }
}


export async function ellipticCurvePairing(proof, vk, debug = false) {
    if (!proof || !proof.A || !proof.B || !proof.C || !vk || !vk.A || !vk.B || !vk.C) {
        console.error("❌ ERROR: Invalid proof or verification key!", proof, vk);
        return false;
    }

    if (debug) console.log("\n🚀 Running ellipticCurvePairing...");

    const babyJub = await circomlibjs.buildBabyjub();
    const F = babyJub.F;
    const q = babyJub.F.p; 

    if (debug) console.log("✅ BabyJubjub curve initialized.");

    try {
        proof.A = utils.leBuff2int(Buffer.from(proof.A, "hex")) % q;
        proof.B = utils.leBuff2int(Buffer.from(proof.B, "hex")) % q;
        proof.C = utils.leBuff2int(Buffer.from(proof.C, "hex")) % q;
        vk.A = utils.leBuff2int(Buffer.from(vk.A, "hex")) % q;
        vk.B = utils.leBuff2int(Buffer.from(vk.B, "hex")) % q;
        vk.C = utils.leBuff2int(Buffer.from(vk.C, "hex")) % q;
    } catch (error) {
        console.error("❌ ERROR: Invalid proof values. Ensure all inputs are hex-encoded BigInts.", error);
        return false;
    }

    if (debug) {
        console.log(`🔹 Proof A (mod q): ${proof.A}`);
        console.log(`🔹 Proof B (mod q): ${proof.B}`);
        console.log(`🔹 Proof C (mod q): ${proof.C}`);
        console.log(`🔹 vk A (mod q): ${vk.A}`);
        console.log(`🔹 vk B (mod q): ${vk.B}`);
        console.log(`🔹 vk C (mod q): ${vk.C}`);
    }

   
    let pairingAB, pairingC;
    try {
        if (proof.A === 0n || proof.B === 0n || proof.C === 0n) {
            throw new Error("❌ ERROR: Invalid proof. Zero values are not allowed.");
        }

        pairingAB = babyJub.mulPointEscalar(babyJub.Base8, (proof.A * proof.B) % q);
        pairingC = babyJub.mulPointEscalar(babyJub.Base8, proof.C);
    } catch (error) {
        console.error("❌ ERROR: Failed to compute pairings in BabyJub.", error);
        return false;
    }

    if (debug) {
        console.log(`🔹 Computed PairingAB: ${pairingAB[0]}, ${pairingAB[1]}`);
        console.log(`🔹 Computed PairingC: ${pairingC[0]}, ${pairingC[1]}`);
    }

 
    const isValid = F.eq(pairingAB[0], pairingC[0]) && F.eq(pairingAB[1], pairingC[1]);

    console.log(isValid ? "✅ Proof is valid!" : "❌ Proof is invalid!");

    return isValid;
}
