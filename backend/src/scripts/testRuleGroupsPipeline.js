const { pool } = require("../config/db");
const {
  getRuleGroups,
  createRuleGroup,
  deleteRuleGroup,
  getRules,
  createRule,
  deleteRule,
} = require("../services/adminService");
const {
  createAssessment,
  getAssessmentDetails,
} = require("../services/assessmentService");

async function runTest() {
  console.log("=== Testing Rule Groups & Assessment Integration ===");
  try {
    // 1. Fetch initial groups
    const groups = await getRuleGroups();
    console.log(`✓ Fetched ${groups.length} rule groups.`);
    if (groups.length === 0) throw new Error("No rule groups found!");
    console.log(
      "Groups:",
      groups
        .map((g) => `${g.id}: ${g.name} (${g.rules_count} rules)`)
        .join(", "),
    );

    // 2. Create a test group
    const testGroupName = `Test Agricultural Lending - ${Date.now()}`;
    const newGroup = await createRuleGroup(
      {
        name: testGroupName,
        description:
          "Evaluation of seasonal crop yield and rainfall volatility",
        isActive: true,
      },
      1,
    );
    console.log(
      `✓ Created test rule group #${newGroup.id} ('${newGroup.name}')`,
    );

    // 3. Create a rule assigned to this test group
    const newRule = await createRule(
      {
        categoryCode: "FINANCIAL",
        factorName: `Crop Yield Volatility Index ${Date.now()}`,
        conditionOperator: "GT",
        thresholdValue: "35%",
        likelihoodScore: 4,
        impactScore: 5,
        severity: "High",
        description:
          "Severe crop yield volatility impacts loan repayment ability.",
        ruleGroupId: newGroup.id,
      },
      1,
    );
    console.log(`✓ Created test rule #${newRule.id} in group #${newGroup.id}`);

    // 4. Verify rules for this group
    const groupRules = await getRules(newGroup.id);
    console.log(
      `✓ Verified ${groupRules.length} rules found specifically for group #${newGroup.id}.`,
    );
    if (groupRules.length !== 1)
      throw new Error("Expected exactly 1 rule in test group");

    // 5. Create an assessment selecting this group
    const assessment = await createAssessment({
      organizationId: 1,
      userId: 1,
      clientName: "Jean Paul Habimana",
      clientIdentifier: "RW-1988-9988",
      ruleGroupId: newGroup.id,
    });
    console.log(
      `✓ Created assessment #${assessment.id} for client '${assessment.client_name}' with rule_group_id ${assessment.rule_group_id}.`,
    );

    // 6. Inspect assessment details
    const details = await getAssessmentDetails(assessment.id);
    console.log(
      `✓ Assessment Details retrieved: target_type = ${details.assessment.target_type}, rule_group_name = ${details.assessment.rule_group_name}`,
    );
    if (details.assessment.rule_group_name !== testGroupName) {
      throw new Error(
        `Expected rule_group_name to be '${testGroupName}', got '${details.assessment.rule_group_name}'`,
      );
    }
    if (details.assessment.client_name !== "Jean Paul Habimana") {
      throw new Error("Client name mismatch");
    }

    // 7. Cleanup test assessment, rule, and group
    await pool.query("DELETE FROM assessments WHERE id = $1", [assessment.id]);
    await deleteRule(newRule.id, 1);
    await deleteRuleGroup(newGroup.id, 1);
    console.log("✓ Cleaned up test records.");

    console.log(
      "\n>>> ALL BACKEND RULE GROUP & SINGLE CLIENT TESTS PASSED! <<<",
    );
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

runTest();
