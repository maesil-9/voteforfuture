import "../../lib/bootstrap";
import {
  generateVoterCode,
  hashCode,
  normalizeCode,
} from "../../../src/server/crypto/code-hash";
import {
  sealChoice,
  unsealChoice,
  ResultsSealedError,
} from "../../../src/server/crypto/ballot-sealing";

const code = generateVoterCode();
console.log("generated code:", code);
console.log("normalized:", normalizeCode(code));
const h1 = hashCode(code);
const h2 = hashCode(code.toLowerCase().replace(/-/g, " "));
console.log("hash stable across formats:", h1 === h2);

const sealed = sealChoice({ electionId: "e1", candidateId: "c1" });
console.log("sealed:", sealed.ciphertext.slice(0, 16) + "...");

// 미래 result_visible_at → 봉인 유지되어야 함
try {
  unsealChoice(sealed, { resultVisibleAt: new Date(Date.now() + 86400000) });
  console.log("SEAL GUARD FAILED — should have thrown");
  process.exit(1);
} catch (e) {
  console.log("seal guard works:", e instanceof ResultsSealedError);
}

// 과거 result_visible_at → 복호화 가능
const choice = unsealChoice(sealed, {
  resultVisibleAt: new Date(Date.now() - 1000),
});
console.log("unsealed matches:", choice.candidateId === "c1" && choice.electionId === "e1");
