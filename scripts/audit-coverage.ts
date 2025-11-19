/**
 * Coverage Audit Script
 *
 * Purpose: Analyze real test coverage and identify gaps
 *
 * This script:
 * 1. Counts all source files
 * 2. Counts all test files
 * 3. Identifies which modules lack tests
 * 4. Calculates real coverage percentage
 * 5. Generates test plan
 */

import fs from "fs";
import path from "path";

interface FileInfo {
  path: string;
  lines: number;
  hasTest: boolean;
  priority: "P0" | "P1" | "P2" | "P3";
}

// Critical modules that MUST have tests
const CRITICAL_MODULES = [
	"device-pool.ts",
	"parallel-executor.ts",
	"test-sharding.ts",
	"android.ts",
	"ios.ts",
	"input-sanitizer.ts",
	"connection-pool.ts",
	"websocket-server.ts"
];

// Get all TypeScript files recursively
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
	const files = fs.readdirSync(dir);

	files.forEach(file => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			getAllTsFiles(filePath, fileList);
		} else if (file.endsWith(".ts") && !file.endsWith(".test.ts") && !file.endsWith(".spec.ts")) {
			fileList.push(filePath);
		}
	});

	return fileList;
}

// Count lines in a file
function countLines(filePath: string): number {
	const content = fs.readFileSync(filePath, "utf-8");
	return content.split("\n").length;
}

// Check if a test file exists for this source file
function hasTestFile(srcPath: string): boolean {
	// Try multiple test locations
	const testPaths = [
		srcPath.replace("src/", "test/unit/").replace(".ts", ".test.ts"),
		srcPath.replace("src/", "test/integration/").replace(".ts", ".test.ts"),
		srcPath.replace(".ts", ".test.ts") // Same directory
	];

	return testPaths.some(testPath => fs.existsSync(testPath));
}

// Determine priority based on file name and path
function getPriority(filePath: string): "P0" | "P1" | "P2" | "P3" {
	const fileName = path.basename(filePath);

	// P0: Already tested critical modules
	if (CRITICAL_MODULES.includes(fileName) && hasTestFile(filePath)) {
		return "P0";
	}

	// P1: Untested critical modules
	if (CRITICAL_MODULES.includes(fileName)) {
		return "P1";
	}

	// P2: Core modules (core/, platforms/, ai/, security/)
	if (filePath.includes("/core/") ||
      filePath.includes("/platforms/") ||
      filePath.includes("/ai/") ||
      filePath.includes("/security/")) {
		return "P2";
	}

	// P3: Everything else
	return "P3";
}

// Main audit function
function auditCoverage() {
	console.log("🔍 COVERAGE AUDIT STARTING...\n");

	const srcDir = path.join(process.cwd(), "src");
	const allFiles = getAllTsFiles(srcDir);

	const fileInfos: FileInfo[] = allFiles.map(filePath => ({
		path: filePath.replace(process.cwd() + path.sep, ""),
		lines: countLines(filePath),
		hasTest: hasTestFile(filePath),
		priority: getPriority(filePath)
	}));

	// Calculate statistics
	const totalFiles = fileInfos.length;
	const testedFiles = fileInfos.filter(f => f.hasTest).length;
	const untestedFiles = totalFiles - testedFiles;
	const realCoverage = ((testedFiles / totalFiles) * 100).toFixed(1);

	const p1Files = fileInfos.filter(f => f.priority === "P1");
	const p2Files = fileInfos.filter(f => f.priority === "P2" && !f.hasTest);

	console.log("📊 COVERAGE STATISTICS");
	console.log("=".repeat(60));
	console.log(`Total Source Files:    ${totalFiles}`);
	console.log(`Files with Tests:      ${testedFiles}`);
	console.log(`Files without Tests:   ${untestedFiles}`);
	console.log(`Real Coverage:         ${realCoverage}%`);
	console.log("=".repeat(60));
	console.log("");

	// Show critical untested files (P1)
	console.log("🚨 CRITICAL UNTESTED FILES (P1)");
	console.log("=".repeat(60));
	if (p1Files.length === 0) {
		console.log("✅ All critical modules have tests!");
	} else {
		p1Files.forEach(file => {
			console.log(`❌ ${file.path} (${file.lines} lines)`);
		});
	}
	console.log("");

	// Show important untested files (P2)
	console.log("⚠️  IMPORTANT UNTESTED FILES (P2)");
	console.log("=".repeat(60));
	if (p2Files.length === 0) {
		console.log("✅ All important modules have tests!");
	} else {
		p2Files.slice(0, 10).forEach(file => {
			console.log(`⚠️  ${file.path} (${file.lines} lines)`);
		});
		if (p2Files.length > 10) {
			console.log(`... and ${p2Files.length - 10} more files`);
		}
	}
	console.log("");

	// Show largest untested files
	const largestUntested = fileInfos
		.filter(f => !f.hasTest)
		.sort((a, b) => b.lines - a.lines)
		.slice(0, 10);

	console.log("📏 LARGEST UNTESTED FILES");
	console.log("=".repeat(60));
	largestUntested.forEach(file => {
		console.log(`${file.lines.toString().padStart(4)} lines - ${file.path}`);
	});
	console.log("");

	// Generate test plan
	console.log("📝 TEST PLAN");
	console.log("=".repeat(60));
	console.log(`Week 1 Goal: ${realCoverage}% → 80% coverage`);
	console.log(`Need to test: ${Math.ceil(totalFiles * 0.8 - testedFiles)} more files`);
	console.log("");
	console.log("Priority order:");
	console.log(`  1. P1 files (${p1Files.length} files) - CRITICAL`);
	console.log(`  2. P2 files (${p2Files.length} files) - IMPORTANT`);
	console.log("");

	// Write detailed report to file
	const reportPath = path.join(process.cwd(), "coverage-audit.md");
	const report = generateMarkdownReport(fileInfos, {
		totalFiles,
		testedFiles,
		untestedFiles,
		realCoverage,
		p1Files,
		p2Files,
		largestUntested
	});

	fs.writeFileSync(reportPath, report);
	console.log(`✅ Detailed report saved to: coverage-audit.md`);
	console.log("");

	// Exit with error if coverage is too low
	if (parseFloat(realCoverage) < 80) {
		console.log(`❌ Coverage ${realCoverage}% is below target (80%)`);
		process.exit(1);
	} else {
		console.log(`✅ Coverage ${realCoverage}% meets target!`);
	}
}

function generateMarkdownReport(fileInfos: FileInfo[], stats: any): string {
	const { totalFiles, testedFiles, untestedFiles, realCoverage, p1Files, p2Files, largestUntested } = stats;

	let md = "# Coverage Audit Report\n\n";
	md += `**Generated:** ${new Date().toISOString()}\n\n`;

	md += "## Summary\n\n";
	md += `| Metric | Value |\n`;
	md += `|--------|-------|\n`;
	md += `| Total Source Files | ${totalFiles} |\n`;
	md += `| Files with Tests | ${testedFiles} |\n`;
	md += `| Files without Tests | ${untestedFiles} |\n`;
	md += `| **Real Coverage** | **${realCoverage}%** |\n`;
	md += `| Target Coverage | 80% |\n`;
	md += `| Gap | ${(80 - parseFloat(realCoverage)).toFixed(1)}% |\n\n`;

	md += "## Critical Untested Files (P1)\n\n";
	if (p1Files.length === 0) {
		md += "✅ All critical modules have tests!\n\n";
	} else {
		p1Files.forEach(file => {
			md += `- [ ] \`${file.path}\` (${file.lines} lines)\n`;
		});
		md += "\n";
	}

	md += "## Important Untested Files (P2)\n\n";
	if (p2Files.length === 0) {
		md += "✅ All important modules have tests!\n\n";
	} else {
		p2Files.forEach(file => {
			md += `- [ ] \`${file.path}\` (${file.lines} lines)\n`;
		});
		md += "\n";
	}

	md += "## Largest Untested Files\n\n";
	largestUntested.forEach(file => {
		md += `- \`${file.path}\` - ${file.lines} lines\n`;
	});
	md += "\n";

	md += "## All Files by Priority\n\n";
	["P1", "P2", "P3"].forEach(priority => {
		const files = fileInfos.filter(f => f.priority === priority);
		md += `### ${priority} (${files.length} files)\n\n`;
		files.forEach(file => {
			const status = file.hasTest ? "✅" : "❌";
			md += `${status} \`${file.path}\` (${file.lines} lines)\n\n`;
		});
	});

	return md;
}

// Run audit
auditCoverage();
