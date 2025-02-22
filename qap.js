class QAP {
    constructor(r1cs, debug = false) {
        if (!r1cs || typeof r1cs.getConstraints !== "function") {
            throw new Error("❌ ERROR: Invalid R1CS input. Cannot convert to QAP.");
        }

        this.debug = debug;
        const constraints = r1cs.getConstraints();

        if (!constraints || constraints.length === 0) {
            throw new Error("❌ ERROR: R1CS has no constraints! Ensure constraints are added before QAP conversion.");
        }

        if (this.debug) {
            console.log("🔹 [QAP] Fetching R1CS Constraints...");
            console.log(JSON.stringify(constraints, null, 2));
        }

        this.polynomials = this.convertToPolynomials(constraints);

        if (this.debug) console.log("✅ [QAP] QAP successfully generated from R1CS.");
    }

    convertToPolynomials(constraints) {
        return constraints.map((c, index) => {
            if (!c.A || !c.B || !c.C) {
                throw new Error(`❌ ERROR: Missing constraint parts in QAP Constraint ${index + 1}.`);
            }

            let polynomialFunction = (x) => {
                let evalA = this.evaluateConstraint(c.A, x);
                let evalB = this.evaluateConstraint(c.B, x);
                let evalC = this.evaluateConstraint(c.C, x);
                let result = (evalA * evalB) - evalC;

                console.log(`🔹 [QAP] Constraint ${index + 1}: (${evalA} * ${evalB}) - ${evalC} = ${result}`);

                return result;
            };

            return { polynomialFunction };
        });
    }

    evaluateConstraint(constraint, x) {
        return Object.entries(constraint).reduce((sum, [varName, coeff]) => {
            if (varName !== "1" && isNaN(x)) {
                throw new Error(`❌ ERROR: Undefined variable '${varName}' encountered during QAP evaluation.`);
            }
            return sum + coeff * (varName === "1" ? 1 : x);
        }, 0);
    }
}

export { QAP };
