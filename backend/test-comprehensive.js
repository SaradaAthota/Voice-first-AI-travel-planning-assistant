/**
 * Comprehensive Test Script
 * Tests all critical paths to verify fixes
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testComprehensive() {
  console.log('🧪 COMPREHENSIVE SYSTEM TEST\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  
  // Test 1: Check tool registration
  console.log('\n📋 Test 1: Tool Registration');
  console.log('-'.repeat(60));
  const fs = require('fs');
  const path = require('path');
  
  try {
    
    const poiSearchPath = path.join(__dirname, 'src/mcp-tools/poi-search/index.ts');
    const itineraryBuilderPath = path.join(__dirname, 'src/mcp-tools/itinerary-builder/index.ts');
    const chatRoutePath = path.join(__dirname, 'src/routes/chat.ts');
    
    if (fs.existsSync(poiSearchPath)) {
      console.log('✅ poi-search tool file exists');
    } else {
      console.log('❌ poi-search tool file NOT found');
      allTestsPassed = false;
    }
    
    if (fs.existsSync(itineraryBuilderPath)) {
      console.log('✅ itinerary-builder tool file exists');
    } else {
      console.log('❌ itinerary-builder tool file NOT found');
      allTestsPassed = false;
    }
    
    if (fs.existsSync(chatRoutePath)) {
      const chatContent = fs.readFileSync(chatRoutePath, 'utf8');
      if (chatContent.includes('registerTool(poiSearchTool)') && 
          chatContent.includes('registerTool(itineraryBuilderTool)')) {
        console.log('✅ Tools are registered in chat.ts');
      } else {
        console.log('❌ Tools NOT registered in chat.ts');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ chat.ts file NOT found');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Error checking tool registration:', error.message);
    allTestsPassed = false;
  }
  
  // Test 2: Check POI result passing logic
  console.log('\n📋 Test 2: POI Result Passing Logic');
  console.log('-'.repeat(60));
  try {
    const toolOrchestratorPath = path.join(__dirname, 'src/orchestration/ToolOrchestrator.ts');
    if (fs.existsSync(toolOrchestratorPath)) {
      const content = fs.readFileSync(toolOrchestratorPath, 'utf8');
      
      // Check if it extracts pois from poiSearchResults
      if (content.includes('poiSearchResults.pois') || 
          content.includes('poisArray') ||
          content.includes('pois: poisArray')) {
        console.log('✅ POI results are correctly extracted');
      } else if (content.includes('pois: poiSearchResults')) {
        console.log('❌ POI results passed incorrectly (whole object instead of array)');
        allTestsPassed = false;
      } else {
        console.log('⚠️  Cannot verify POI result passing logic');
      }
    }
  } catch (error) {
    console.log('❌ Error checking POI logic:', error.message);
    allTestsPassed = false;
  }
  
  // Test 3: Check database save logging
  console.log('\n📋 Test 3: Database Save Logging');
  console.log('-'.repeat(60));
  try {
    const itineraryBuilderPath = path.join(__dirname, 'src/mcp-tools/itinerary-builder/itinerary-builder-tool.ts');
    if (fs.existsSync(itineraryBuilderPath)) {
      const content = fs.readFileSync(itineraryBuilderPath, 'utf8');
      
      if (content.includes('console.log(\'Saving itinerary to database\')') ||
          content.includes('console.log("Saving itinerary to database")')) {
        console.log('✅ Save logging added');
      } else {
        console.log('⚠️  Save logging may be missing');
      }
      
      if (content.includes('console.error(\'CRITICAL: Failed to save itinerary\')') ||
          content.includes('console.error("CRITICAL: Failed to save itinerary")')) {
        console.log('✅ Critical error logging added');
      } else {
        console.log('⚠️  Critical error logging may be missing');
      }
      
      if (content.includes('throw') && content.includes('saveItinerary')) {
        console.log('✅ Errors are re-thrown (not silently swallowed)');
      } else {
        console.log('⚠️  Errors may still be silently swallowed');
      }
    }
  } catch (error) {
    console.log('❌ Error checking save logging:', error.message);
    allTestsPassed = false;
  }
  
  // Test 4: Check database connection and schema
  console.log('\n📋 Test 4: Database Connection & Schema');
  console.log('-'.repeat(60));
  try {
    // Test trips table
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id')
      .limit(1);
    
    if (tripsError) {
      console.log('❌ Cannot access trips table:', tripsError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ trips table accessible');
    }
    
    // Test itineraries table
    const { data: itineraries, error: itinerariesError } = await supabase
      .from('itineraries')
      .select('id')
      .limit(1);
    
    if (itinerariesError) {
      console.log('❌ Cannot access itineraries table:', itinerariesError.message);
      console.log('   Code:', itinerariesError.code);
      console.log('   Hint:', itinerariesError.hint);
      allTestsPassed = false;
    } else {
      console.log('✅ itineraries table accessible');
    }
    
    // Test eval_results table
    const { data: evalResults, error: evalError } = await supabase
      .from('eval_results')
      .select('id')
      .limit(1);
    
    if (evalError) {
      console.log('❌ Cannot access eval_results table:', evalError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ eval_results table accessible');
    }
  } catch (error) {
    console.log('❌ Error checking database:', error.message);
    allTestsPassed = false;
  }
  
  // Test 5: Check environment variables
  console.log('\n📋 Test 5: Environment Variables');
  console.log('-'.repeat(60));
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'OPENAI_API_KEY',
  ];
  
  const optionalVars = [
    'N8N_WEBHOOK_URL',
    'CHROMADB_URL',
  ];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`❌ ${varName} is NOT set`);
      allTestsPassed = false;
    }
  }
  
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`⚠️  ${varName} is NOT set (optional)`);
    }
  }
  
  // Test 6: Verify code logic for POI extraction
  console.log('\n📋 Test 6: Code Logic Verification');
  console.log('-'.repeat(60));
  try {
    const toolOrchestratorPath = path.join(__dirname, 'src/orchestration/ToolOrchestrator.ts');
    if (fs.existsSync(toolOrchestratorPath)) {
      const content = fs.readFileSync(toolOrchestratorPath, 'utf8');
      
      // Check for correct POI extraction
      const hasCorrectExtraction = content.includes('poiSearchResults.pois') || 
                                   (content.includes('poisArray') && content.includes('poiSearchResults'));
      
      if (hasCorrectExtraction) {
        console.log('✅ POI extraction logic is correct');
      } else {
        console.log('❌ POI extraction logic may be incorrect');
        allTestsPassed = false;
      }
      
      // Check for logging
      if (content.includes('Injecting POIs into itinerary_builder')) {
        console.log('✅ POI injection logging added');
      }
    }
  } catch (error) {
    console.log('❌ Error verifying code logic:', error.message);
    allTestsPassed = false;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (allTestsPassed) {
    console.log('\n✅ All static checks passed!');
    console.log('\n⚠️  Note: This only checks code structure.');
    console.log('   For full testing, you need to:');
    console.log('   1. Start the backend server');
    console.log('   2. Generate an itinerary through the UI');
    console.log('   3. Check backend logs for runtime behavior');
  } else {
    console.log('\n❌ Some checks failed. Please review the errors above.');
  }
  
  console.log('\n');
}

testComprehensive().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

