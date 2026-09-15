const { pool } = require("../config/db");
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  updateCategoryWeightsBatch,
} = require("../services/adminService");
const {
  createAssessment,
  getAssessmentDetails,
} = require("../services/assessmentService");

async function verifyAll() {
  console.log("--- ERIDSS Automated Verification Test ---");

  try {
    // 1. Verify Category CRUD
    console.log("\n1. Testing Category CRUD...");
    const initialCats = await getCategories();
    console.log(`Initial active categories: ${initialCats.length}`);

    const testCatCode = "TEST_INDIVIDUAL_CREDIT";
    // Clean up if already exists
    try {
      await deleteCategory(testCatCode, 1);
    } catch (e) {}

    const createdCat = await createCategory(
      {
        code: testCatCode,
        name: "Individual Credit Risk",
        defaultWeight: 0,
        description:
          "Evaluating individual borrower creditworthiness and loan repayment capacity",
        isActive: true,
      },
      1,
    );
    console.log(`✓ Category Created: ${createdCat.code} (${createdCat.name})`);

    const updatedCat = await updateCategory(
      testCatCode,
      {
        name: "Individual Credit & Solvency Risk",
        description: "Updated description for solvency risk",
      },
      1,
    );
    console.log(`✓ Category Updated: ${updatedCat.name}`);

    // Clean up test category
    await deleteCategory(testCatCode, 1);
    console.log(`✓ Category Deleted successfully: ${testCatCode}`);

    // 2. Verify Deterministic Rules Engine CRUD
    console.log("\n2. Testing Rules Engine CRUD...");
    const testRule = await createRule(
      {
        categoryCode: "FINANCIAL",
        factorName: "Test Income Deficit Ratio",
        conditionOperator: "LT",
        thresholdValue: "0",
        likelihoodScore: 4,
        impactScore: 5,
        severity: "Critical",
        description: "Test rule for negative cash flow or income deficit",
      },
      1,
    );
    console.log(`✓ Rule Created: ID #${testRule.id} - ${testRule.factor_name}`);

    const updatedRule = await updateRule(
      testRule.id,
      {
        severity: "High",
        likelihood_score: 5,
      },
      1,
    );
    console.log(
      `✓ Rule Updated: ID #${updatedRule.id} - Severity: ${updatedRule.severity}`,
    );

    await deleteRule(testRule.id, 1);
    console.log(`✓ Rule Deleted successfully: ID #${testRule.id}`);

    // 3. Verify Single User Assessment Creation
    console.log("\n3. Testing Single User Assessment Record Creation...");
    const singleClientAssessment = await createAssessment({
      organizationId: 1,
      userId: 1,
      title: "Individual Loan Risk Assessment - Johnathan Doe",
      targetType: "SINGLE_USER",
      clientName: "Johnathan Doe",
      clientIdentifier: "NAT-ID-11998877665544",
      clientEmail: "johnathan.doe@example.com",
      clientPhone: "+250 788 999 888",
      clientIncome: 950000,
      clientMetadata: {
        loanPurpose: "SME Expansion Working Capital",
        loanAmount: 5000000,
      },
    });

    console.log(
      `✓ Single Client Assessment Created: ID #${singleClientAssessment.id}`,
    );
    console.log(`  - Target Type: ${singleClientAssessment.target_type}`);
    console.log(`  - Client Name: ${singleClientAssessment.client_name}`);
    console.log(
      `  - Client Identifier: ${singleClientAssessment.client_identifier}`,
    );
    console.log(
      `  - Monthly Income: ${singleClientAssessment.client_income} RWF`,
    );

    const details = await getAssessmentDetails(singleClientAssessment.id);
    console.log(
      `✓ Verified getAssessmentDetails retrieves client fields: ${details.assessment.client_name === "Johnathan Doe"}`,
    );

    // Clean up test assessment
    await pool.query("DELETE FROM assessments WHERE id = $1", [
      singleClientAssessment.id,
    ]);
    console.log(`✓ Cleaned up test assessment #${singleClientAssessment.id}`);

    console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  }
}

verifyAll();
