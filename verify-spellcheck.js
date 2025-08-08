// Verification script for spell check implementation
// Run this in browser console when RSS Visit Report app is loaded

function verifySpellCheck() {
    console.log('🔍 Verifying Spell Check Implementation...\n');
    
    // Wait for the page to be fully loaded
    if (document.readyState !== 'complete') {
        console.log('Page still loading, retrying in 1 second...');
        setTimeout(verifySpellCheck, 1000);
        return;
    }
    
    // Find all input and textarea elements
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    
    if (inputs.length === 0) {
        console.log('❌ No text inputs found. Make sure you have opened a form (Add Device, Edit Location, etc.)');
        console.log('💡 Try: Click "Add Device" or "Edit" on an existing item to see form fields');
        return;
    }
    
    console.log(`✅ Found ${inputs.length} text input fields\n`);
    
    let technicalFields = 0;
    let descriptiveFields = 0;
    let unknownFields = 0;
    
    inputs.forEach((input, index) => {
        // Try to find associated label
        let label = '';
        
        // Method 1: Previous sibling label
        if (input.previousElementSibling && input.previousElementSibling.tagName === 'LABEL') {
            label = input.previousElementSibling.textContent.trim();
        }
        // Method 2: Parent div with label
        else if (input.parentElement) {
            const labelEl = input.parentElement.querySelector('label');
            if (labelEl) {
                label = labelEl.textContent.trim();
            }
        }
        // Method 3: Placeholder as fallback
        if (!label && input.placeholder) {
            label = `[${input.placeholder}]`;
        }
        // Method 4: Last resort - use input type/name
        if (!label) {
            label = input.type + (input.name ? ` (${input.name})` : '');
        }
        
        const spellCheckEnabled = input.spellcheck;
        const inputType = input.tagName.toLowerCase();
        
        // Categorize based on expected behavior
        const expectedTechnical = [
            'device name', 'model', 'serial number', 'asset tag', 'rack name', 
            'power', 'switch', 'port', 'unit', 'span', 'ip', 'hostname', 'mac'
        ];
        
        const expectedDescriptive = [
            'notes', 'description', 'comment'
        ];
        
        const labelLower = label.toLowerCase();
        let expectedSpellCheck = null;
        let category = '';
        
        if (expectedTechnical.some(tech => labelLower.includes(tech))) {
            expectedSpellCheck = false;
            category = 'Technical';
            technicalFields++;
        } else if (expectedDescriptive.some(desc => labelLower.includes(desc))) {
            expectedSpellCheck = true;
            category = 'Descriptive';
            descriptiveFields++;
        } else {
            category = 'Unknown';
            unknownFields++;
        }
        
        const status = expectedSpellCheck === null ? '❓' : 
                      (spellCheckEnabled === expectedSpellCheck ? '✅' : '❌');
        
        console.log(`${status} ${inputType.toUpperCase()}: "${label}"`);
        console.log(`   Category: ${category}`);
        console.log(`   spellcheck: ${spellCheckEnabled}`);
        if (expectedSpellCheck !== null) {
            console.log(`   Expected: ${expectedSpellCheck}`);
        }
        console.log('');
    });
    
    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   Technical fields: ${technicalFields}`);
    console.log(`   Descriptive fields: ${descriptiveFields}`);
    console.log(`   Unknown fields: ${unknownFields}`);
    console.log(`   Total fields: ${inputs.length}`);
    
    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('1. Try typing misspelled words in technical fields (should NOT get red underlines)');
    console.log('2. Try typing misspelled words in Notes/Description fields (SHOULD get red underlines)');
    console.log('3. Example technical test: "Servr-001-PROD" in Device Name field');
    console.log('4. Example descriptive test: "This servr has excelent performence" in Notes field');
}

// Auto-run the verification
verifySpellCheck();

// Export for manual use
window.verifySpellCheck = verifySpellCheck;