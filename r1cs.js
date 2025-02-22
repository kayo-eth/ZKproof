import { utils } from "ffjavascript";
import * as circomlibjs from "circomlibjs";

export class R1CS {
    constructor() {
        this.constraints = [];
        this.variables = { "1": 1 }; 
        this.poseidon = null; 
    }

    async setupPoseidon() {
        if (!this.poseidon) {
            console.log("🔹 [R1CS] Initializing Poseidon Hash Function...");
            this.poseidon = await circomlibjs.buildPoseidon(); 
        }
    }

    async addVariable(name, value = 0) {
        if (typeof name !== "string" || name.trim() === "") {
            throw new Error("❌ ERROR: Variable name must be a non-empty string.");
        }
        this.variables[name] = value;
        console.log(`✅ [R1CS] Variable added: ${name} = ${value}`);
        return name;
    }

    async updateVariable(name, value) {
        if (!(name in this.variables)) {
            throw new Error(`❌ ERROR: Variable ${name} is not defined.`);
        }
        this.variables[name] = value;
        console.log(`✅ [R1CS] Variable updated: ${name} = ${value}`);
    }

    async addHashConstraint(inputVars, outputVar) {
        await this.setupPoseidon();

        for (let inputVar of inputVars) {
            if (!(inputVar in this.variables)) {
                throw new Error(`❌ ERROR: Undefined variable used in constraint: ${inputVar}`);
            }
        }

       
        console.log(`🔹 [R1CS] Computing Poseidon hash for inputs: ${inputVars.map(v => this.variables[v])}`);
        const hashedValues = this.poseidon(inputVars.map(v => BigInt(this.variables[v]))); 
        const hashedValueBigInt = utils.leBuff2int(this.poseidon.F.toObject(hashedValues));

        const constraint = {
            A: inputVars.reduce((obj, v) => ({ ...obj, [v]: 1 }), {}), 
            B: { "1": 1 }, 
            C: { [outputVar]: hashedValueBigInt },
        };

        this.constraints.push(constraint);

        console.log(`✅ [R1CS] Multi-Witness Hash Constraint added: H(${inputVars.join(", ")}) = ${outputVar} (${hashedValueBigInt})`);
        console.log(`🔹 [R1CS] Stored Constraint:`, JSON.stringify(constraint, (key, value) =>
            typeof value === "bigint" ? value.toString() : value, 2));
    }

    async addCommitmentConstraint(balanceVar, secretVar, outputVar) {
        await this.setupPoseidon(); 

        if (!(balanceVar in this.variables) || !(secretVar in this.variables)) {
            throw new Error("❌ ERROR: Undefined variable used in commitment.");
        }

      
        console.log(`🔹 [R1CS] Computing Commitment: Poseidon(${balanceVar}, ${secretVar})`);
        const commitment = this.poseidon([BigInt(this.variables[balanceVar]), BigInt(this.variables[secretVar])]);
        const commitmentBigInt = utils.leBuff2int(this.poseidon.F.toObject(commitment));

        this.constraints.push({
            A: { [balanceVar]: 1, [secretVar]: 1 },
            B: { "1": 1 },
            C: { [outputVar]: commitmentBigInt },
        });

        console.log(`✅ [R1CS] Commitment Constraint Added: C(${outputVar}) = Poseidon(${balanceVar}, ${secretVar})`);
    }

    addConstraint(A, B, C) {
        if (!A || !B || !C || typeof A !== "object" || typeof B !== "object" || typeof C !== "object") {
            throw new Error("❌ ERROR: Invalid constraint format. A, B, and C must be objects.");
        }

        this.constraints.push({ A, B, C });
        console.log(`✅ [R1CS] Constraint added: A * B = C`);
    }

    getConstraints() {
        if (this.constraints.length === 0) {
            console.warn("⚠ WARNING: No constraints found in R1CS!");
        }
        return this.constraints;
    }
}
