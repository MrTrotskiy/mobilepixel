/**
 * Show all elements on screen - for debugging
 */
const { AndroidRobot } = require("../../lib/platforms/android");

async function showElements() {
	const robot = new AndroidRobot("843b3cd3");
	
	console.log("Opening Settings...");
	await robot.launchApp("com.android.settings");
	await new Promise(resolve => setTimeout(resolve, 2000));
	
	console.log("\nGetting elements on screen...\n");
	const elements = await robot.getElementsOnScreen();
	
	console.log(`Found ${elements.length} elements:\n`);
	console.log("=".repeat(80));
	
	elements.forEach((el, i) => {
		console.log(`\n${i + 1}. Type: ${el.type}`);
		if (el.text) console.log(`   Text: "${el.text}"`);
		if (el.label) console.log(`   Label: "${el.label}"`);
		if (el.name) console.log(`   Name: "${el.name}"`);
		console.log(`   Position: (${el.rect.x}, ${el.rect.y})`);
		console.log(`   Size: ${el.rect.width}x${el.rect.height}`);
	});
}

showElements().catch(console.error);

